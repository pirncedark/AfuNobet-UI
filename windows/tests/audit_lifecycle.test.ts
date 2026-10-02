import { expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { audit } from '../scripts/denetim.mjs';
function fixture() { const root=mkdtempSync(path.join(tmpdir(),'afu-life-audit-')); for(const dir of ['src','src-tauri/src','public','dist'])mkdirSync(path.join(root,dir),{recursive:true}); return root; }
function cleanup(root:string) {if(!path.resolve(root).startsWith(path.resolve(tmpdir())+path.sep)||!path.basename(root).startsWith('afu-life-audit-'))throw new Error('Hedef sınırı');rmSync(root,{recursive:true});}
it('yalnız Codex köprüsünün kendi sürecine izin verir',()=>{const root=fixture();try{writeFileSync(path.join(root,'src-tauri/src/codex.rs'),'let mut cmd = Command::new(exe);\nlet _ = self.child.kill();');expect(audit(root)).toEqual([]);}finally{cleanup(root);}});
it('aynı köprüde yabancı süreç ve ShellExecute başka dosyada reddedilir',()=>{const root=fixture();try{writeFileSync(path.join(root,'src-tauri/src/codex.rs'),'Command::new("powershell");\nother.kill();');writeFileSync(path.join(root,'src-tauri/src/bad.rs'),'ShellExecuteW();');const result=audit(root);expect(result.filter(x=>x.includes('codex.rs')).length).toBe(2);expect(result.some(x=>x.includes('bad.rs'))).toBe(true);}finally{cleanup(root);}});
