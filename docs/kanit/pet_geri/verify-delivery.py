from pathlib import Path
import hashlib, json, re

out = Path(__file__).resolve().parent
root = out.parents[2]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
before = json.loads((out / 'protected-before.json').read_text(encoding='utf8'))
changed = [name for name, digest in before.items() if not (root / name).is_file() or sha(root / name) != digest]
visual = json.loads((out / 'visual-comparison.json').read_text(encoding='utf8'))
screenshots = []
for item in visual:
    suffix = f"{item['frame']}-{item['scale']}.png"
    identical = (out / ('reference-' + suffix)).read_bytes() == (out / ('restored-' + suffix)).read_bytes()
    screenshots.append({'frame': item['frame'], 'scale': item['scale'], 'identical': identical})
extraction = json.loads((out / 'reference-extraction.json').read_text(encoding='utf8'))
reference = root / 'dist/onceki/afunobet-ui-coucou-20261002-233831.exe'
old_exe_ok = sha(reference) == extraction['exe_sha256']
reference_bytes = reference.read_bytes()
images_ok = all(sha(root / 'windows/public/afu/pet' / item['file']) == item['sha256'] and item['exe_offset'] is not None for item in extraction['pet_images'])
results = re.findall(r'test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored', (out / 'cargo-test-tur2.txt').read_text(encoding='utf-16'))
totals = [sum(int(row[i]) for row in results) for i in range(3)]
external = [name for name in changed if Path(name).as_posix().replace('\\', '/') == 'windows/src/views/views.ts']
unexpected = [name for name in changed if name not in external]
proof = {'protected_file_count': len(before), 'changed_protected_files': changed, 'external_changes': external, 'external_change_note': 'views.ts 00:10:06 tarihinde paralel F1-F5 çalışmasında değişti; bu devam turu views.ts dosyasına yazmadı. SONUC_F1_F5.md 00:12:28 kaydı mevcut.', 'unexpected_changes': unexpected, 'reference_exe_hash_matches': old_exe_ok, 'all_reference_pet_assets_match': images_ok, 'screenshots': screenshots, 'rust': {'passed': totals[0], 'failed': totals[1], 'ignored': totals[2]}}
exe = root / 'dist/afunobet-ui-coucou.exe'
release = root / 'windows/target/release/afunobet-ui.exe'
pack_log = (out / 'pack.txt').read_bytes()
pack_text = pack_log.decode('utf-16') if pack_log.startswith(b'\xff\xfe') else pack_log.decode('utf8', errors='replace')
proof['pack_completed'] = 'Finished' in pack_text and 'release' in pack_text and 'originalSha256' not in pack_text and '"sha256"' in pack_text
proof['exe'] = {'path': str(exe.relative_to(root)), 'sha256': sha(exe), 'bytes': exe.stat().st_size, 'matches_release': sha(exe) == sha(release)}
(out / 'delivery-verification.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({key: value for key, value in proof.items() if key != 'screenshots'}, ensure_ascii=False))
assert not unexpected and old_exe_ok and images_ok and all(item['identical'] for item in screenshots)
assert results and totals[1] == 0
if proof['pack_completed']:
    assert proof['exe']['matches_release']
