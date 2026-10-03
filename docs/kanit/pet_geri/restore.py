from pathlib import Path
import subprocess, hashlib, json

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
def head(name):
    return subprocess.check_output(['git','show','HEAD:'+name], cwd=root).decode('utf8')
def hashes():
    files = list((root/'windows/public/afu').rglob('*')) + list((root/'afu-character').rglob('*'))
    files += [root/'windows/src-tauri/src/island.rs', root/'windows/src/afu/character.ts', root/'windows/src/views/views.ts', root/'windows/src/core/labels.ts']
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
(out/'protected-before.json').write_text(json.dumps(hashes(), indent=2))

name='windows/src/afu/pet.ts'
current=(root/name).read_text(encoding='utf8')
old=head(name)
# Retain the independent app download support, and the pointer/IPC plumbing.
current_apps=current[current.index('  private renderApps()'):current.index('  private async openApp')]
start=old.index('  private renderApps()'); end=old.index('  private async openApp')
old=old[:start]+current_apps+old[end:]
old=old.replace('import { T }', 'import { Bridge, onEvent } from "../core/bridge";\nimport { T }')
old=old.replace(' | "etkilesim";', ' | "etkilesim" | "surukleme" | "geri_donus" | "yaslanma";')
old=old.replace('  donus:', '  surukleme: [{ kare: "akis_suzulme", ms: Infinity }],\n  geri_donus: [{ kare: "akis_suzulme", ms: Infinity }],\n  yaslanma: [{ kare: "akis_tutunma", ms: T.grab }, { kare: "akis_bekleme", ms: 600 }],\n  donus:')
old=old.replace('  acknowledge()', '  land() { this.lastActivity = this.now; this.setPose("yaslanma"); }\n  acknowledge()')
old=old.replace('    this.lastActivity = this.now;\n    if (event.kind', '    this.lastActivity = this.now;\n    if (["surukleme", "geri_donus", "yaslanma"].includes(this.pose)) {\n      if (event.kind === "RATE_LIMIT" || event.kind === "JOB_FAILED") this.balloon = "!";\n      else if (event.kind === "WAITING") this.balloon = "?";\n      return;\n    }\n    if (event.kind')
old=old.replace('if (this.pose === "uyari" || this.pose === "hata") return;\n    if (on)', 'if (["uyari", "hata", "surukleme", "geri_donus", "yaslanma"].includes(this.pose)) return;\n    if (on)')
old=old.replace('"uyku", "yuzme"].includes', '"uyku", "yuzme", "surukleme", "geri_donus"].includes')
old=old.replace('{ this.balloon = null; this.setPose("bekleme"); }', '{ if (this.pose !== "yaslanma") this.balloon = null; this.setPose("bekleme"); }')
old=old.replace('  private reduced =', '  private dragPending: Promise<boolean> | null = null;\n  private reduced =')
click_start=current.index('    this.el = h("button"'); click_end=current.index('    this.el.addEventListener("contextmenu"')
drag=current[click_start:click_end]
drag=drag.replace('    this.image.style.cssText = petLayout("akis_bekleme.webp");\n    this.previous.style.cssText = this.image.style.cssText;\n','')
drag=drag.replace('Afu ta??namad?. Yeniden dene.', 'Afu taşınamadı. Yeniden dene.')
drag=drag.replace('      this.el.setPointerCapture(event.pointerId);','      if (event.isTrusted) this.el.setPointerCapture(event.pointerId);')
drag=drag.replace('      this.refresh();','      this.paint();')
start=old.index('    this.el = h("button"'); end=old.index('    this.el.addEventListener("contextmenu"')
old=old[:start]+drag+old[end:]
old=old.replace('"mouseenter", () => { this.model', '"mouseenter", () => { if (this.dragPending) return; this.model')
old=old.replace('"mouseleave", () => { this.model', '"mouseleave", () => { if (this.dragPending) return; this.model')
(root/name).write_text(old, encoding='utf8')

name='windows/src/style.css'
css=(root/name).read_text(encoding='utf8'); oldcss=head(name)
start=css.index('body.pet-mode'); end=css.index('/* Proje eylemi',start)
ref=oldcss[oldcss.index('#afu-pet {'):oldcss.index('/* Proje eylemi')]
# Touch handling is the sole added style; no drawing-scale or geometry changes.
ref+=' #afu-pet { touch-action:none; user-select:none; cursor:grab; }\n #afu-pet[data-pose=surukleme] { cursor:grabbing; }\n'
(root/name).write_text(css[:start]+ref+css[end:], encoding='utf8')

name='windows/src-tauri/src/glide.rs'
current=(root/name).read_text(encoding='utf8'); old=head(name)
start=current.index('    #[test]\n    fn drag_threshold'); end=current.index('    #[test]\n    fn cancelled_generation',start)
old=old.replace('    #[test]\n    fn cancelled_generation',current[start:end]+'    #[test]\n    fn cancelled_generation')
(root/name).write_text(old,encoding='utf8')
name='windows/src-tauri/src/taskbar.rs'
current=(root/name).read_text(encoding='utf8')
start=current.index('/// All bounds'); end=current.index('pub fn pet_konumu',start)
current=current[:start]+current[end:]
current=current.replace('pet_yerlesimi(&bar, None, scale, work)', '(crate::dpi::physical_for(128.0, scale) as i32, pet_konumu(&bar, None, size, size, work))')
current=current.replace('pet_yerlesimi(&bar, Some(start), scale, work)', '(crate::dpi::physical_for(128.0, scale) as i32, pet_konumu(&bar, Some(start), size, size, work))')
(root/name).write_text(current,encoding='utf8')

# Animation-migration tests are reverted to the original expectations.
name='windows/tests/pet.test.ts'
(root/name).write_text(head(name),encoding='utf8')
