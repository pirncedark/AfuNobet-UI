import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateManifest, safeRead, validateExe, packageFileName } from "./msix-pack.mjs";
const manifest = `<Package><Identity Name="AfuNobetUI" Publisher="CN=AfuLocal" Version="0.1.1.0" ProcessorArchitecture="x64"/><Application Id="AfuNobetUI" Executable="afunobet-ui.exe" EntryPoint="Windows.FullTrustApplication"/><Capability Name="internetClient"/><rescap:Capability Name="runFullTrust"/><DeviceCapability Name="microphone"/></Package>`;
test("publisher, capabilities and sole executable are bounded", () => {
  assert.equal(validateManifest(manifest), true);
});
test("tampered publisher, exe escape or missing microphone is rejected", () => {
  for(const xml of [manifest.replace("CN=AfuLocal","CN=Other"), manifest.replace("afunobet-ui.exe","../else.exe"), manifest.replace('Name="microphone"','Name="webcam"')]) {
    assert.throws(()=>validateManifest(xml));
  }
});
test("reads bounded regular files only inside approved root", () => {
  const root=mkdtempSync(join(tmpdir(),"afu-msix-test-"));
  try { writeFileSync(join(root,"file"),"abc"); mkdirSync(join(root,"directory"));
    assert.equal(safeRead(join(root,"file"),root,3).toString(),"abc");
    assert.throws(()=>safeRead(join(root,"file"),root,2));
    assert.throws(()=>safeRead(join(root,"directory"),root,100));
    assert.throws(()=>safeRead(join(root,"../outside"),root,100));
  } finally { rmSync(root,{recursive:true,force:true}); }
});
test("package version and x64 PE cannot be replaced by arbitrary payload", () => {
  assert.equal(packageFileName("0.1.1.0"),"AfuNobetUI_0.1.1.0_x64_unsigned.msix");
  for(const version of ["../bad","0.1","1.1.1.65536"]) assert.throws(()=>packageFileName(version));
  const pe=Buffer.alloc(128); pe.write("MZ"); pe.writeUInt32LE(64,60); pe.write("PE\0\0",64);pe.writeUInt16LE(0x8664,68);
  assert.equal(validateExe(pe),true); pe.writeUInt16LE(0x14c,68); assert.throws(()=>validateExe(pe));
});
