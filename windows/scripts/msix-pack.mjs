// Yalnız önceden derlenmiş Afu exe'sini paketler; uygulama veya kurulum başlatmaz.
import { createHash } from "node:crypto";
import { openSync, closeSync, fstatSync, lstatSync, realpathSync, readSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve, relative, isAbsolute, join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const workspace = fileURLToPath(new URL("../../", import.meta.url));
export const SDK_DIR = "C:/Program Files (x86)/Windows Kits/10/bin/10.0.26100.0/x64";
export const PUBLISHER = "CN=AfuLocal";
export const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function inside(path, root) { const rel = relative(root, path); return rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(rel); }
export function safeRead(path, root, maximum) {
  const candidate = resolve(path); const base = realpathSync(root);
  if (!inside(candidate,base) || lstatSync(candidate).isSymbolicLink() || !inside(realpathSync(candidate),base)) throw new Error("Dosya izin verilen klasörde değil.");
  const fd = openSync(candidate,"r");
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > maximum) throw new Error("Dosya boyutu veya türü uygun değil.");
    const bytes = Buffer.alloc(stat.size+1); let count=0;
    while (count<bytes.length) { const n=readSync(fd,bytes,count,bytes.length-count,count); if (!n) break; count+=n; }
    if (count!==stat.size) throw new Error("Paket kaynağı okuma sırasında değişti.");
    return bytes.subarray(0,count);
  } finally { closeSync(fd); }
}
export function validateExe(bytes) {
  const offset=bytes.length>=64 ? bytes.readUInt32LE(60) : -1;
  if (bytes.subarray(0,2).toString()!=="MZ" || offset<64 || offset+6>bytes.length || !bytes.subarray(offset,offset+4).equals(Buffer.from([80,69,0,0])) || bytes.readUInt16LE(offset+4)!==0x8664) throw new Error("Paket kaynağı x64 Windows uygulaması değil.");
  return true;
}
export function packageFileName(version) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(version) || version.split(".").some(v=>Number(v)>65535)) throw new Error("Paket sürümü uygun değil.");
  return `AfuNobetUI_${version}_x64_unsigned.msix`;
}
export function validateManifest(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Manifest dış kaynak içeremez.");
  const identities=[...xml.matchAll(/<Identity\b([^>]*)\/?\s*>/g)]; const applications=[...xml.matchAll(/<Application\b([^>]*)\/?\s*>/g)];
  if (identities.length!==1 || applications.length!==1) throw new Error("Tek paket ve uygulama gerekir.");
  const attrs=text=>Object.fromEntries([...text.matchAll(/([\w:]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  const identity=attrs(identities[0][1]); const app=attrs(applications[0][1]);
  if (identity.Name!=="AfuNobetUI" || identity.Publisher!==PUBLISHER || identity.ProcessorArchitecture!=="x64" || app.Id!=="AfuNobetUI" || app.Executable!=="afunobet-ui.exe" || app.EntryPoint!=="Windows.FullTrustApplication") throw new Error("Paket kimliği veya uygulama yolu uygun değil.");
  packageFileName(identity.Version);
  for(const capability of ["internetClient","runFullTrust","microphone"]) if (!new RegExp(`<(?:(?:rescap:)?Capability|DeviceCapability)\\b[^>]*Name="${capability}"`).test(xml)) throw new Error("Paket izin sözleşmesi eksik.");
  return true;
}
export function buildMsix() {
  const manifestBytes=safeRead(join(workspace,"windows/packaging/AppxManifest.xml"),workspace,65536);
  const xml=manifestBytes.toString("utf8"); validateManifest(xml);
  const version=xml.match(/\bVersion="([^"]+)"/)[1]; const name=packageFileName(version);
  const makeappx=join(SDK_DIR,"MakeAppx.exe");
  if (!lstatSync(makeappx).isFile()) throw new Error("Windows paketleme aracı bulunamadı.");
  const payload=[{source:"windows/target/release/afunobet-ui.exe", target:"afunobet-ui.exe", maximum:128*1024*1024},
    {source:"LICENSE",target:"LICENSE.txt",maximum:128*1024},
    {source:"LICENSE-ASSETS.md",target:"LICENSE-ASSETS.md",maximum:128*1024},
    {source:"THIRD_PARTY.md",target:"THIRD_PARTY.md",maximum:128*1024},
    ...["Logo44.png","Logo150.png","StoreLogo.png"].map(name=>({source:`windows/packaging/assets/${name}`,target:`Assets/${name}`,maximum:1024*1024}))];
  const verified=payload.map(item=>({...item, bytes:safeRead(join(workspace,item.source),workspace,item.maximum)}));
  validateExe(verified[0].bytes);
  for(const icon of verified.filter(item=>item.target.startsWith("Assets/"))) {
    if (!icon.bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || icon.bytes.readUInt32BE(16)!==icon.bytes.readUInt32BE(20) || icon.bytes.readUInt32BE(16)>512) throw new Error("Afu simgesi uygun PNG değil.");
  }
  const tempRoot=realpathSync(tmpdir()); const stage=mkdtempSync(join(tempRoot,"afu-msix-stage-"));
  const out=join(workspace,"dist/msix"); mkdirSync(out,{recursive:true});
  if (!inside(realpathSync(out),realpathSync(workspace))) throw new Error("Paket çıktı yolu uygun değil.");
  const output=join(out,name);
  try {
    writeFileSync(join(stage,"AppxManifest.xml"),manifestBytes);
    for(const item of verified) { const target=join(stage,item.target); mkdirSync(dirname(target),{recursive:true}); writeFileSync(target,item.bytes); }
    const result=spawnSync(makeappx,["pack","/d",stage,"/p",output,"/o"],{encoding:"utf8",windowsHide:true,maxBuffer:2*1024*1024});
    if (result.status!==0) throw new Error(`Windows paket doğrulaması başarısız.\n${result.stdout||""}${result.stderr||""}`);
    const packageBytes=safeRead(output,out,256*1024*1024);
    const info={identity:"AfuNobetUI",publisher:PUBLISHER,version,architecture:"x64",sdk:"10.0.26100.0",signed:false,
      packageFile:name,sha256:hash(packageBytes),manifestSha256:hash(manifestBytes),nativeInstall:"UNVERIFIED",
      inputs:[{source:"windows/packaging/AppxManifest.xml",target:"AppxManifest.xml",bytes:manifestBytes.length,sha256:hash(manifestBytes)},...verified.map(({source,target,bytes})=>({source,target,bytes:bytes.length,sha256:hash(bytes)}))]};
    writeFileSync(join(out,"msix-build.json"),JSON.stringify(info,null,2)+"\n");
    console.log(JSON.stringify({packageFile:output,sha256:info.sha256,validated:true,signed:false})); return info;
  } finally {
    if (!inside(realpathSync(stage),tempRoot) || !stage.includes("afu-msix-stage-")) throw new Error("Geçici paket klasörü sınırı doğrulanamadı.");
    rmSync(stage,{recursive:true,force:true});
  }
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) buildMsix();
