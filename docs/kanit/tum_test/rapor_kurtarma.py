"""Generate recovery coverage from actual source gates and existing headless evidence.

No invented runtime results: GEÇTİ describes only the explicit source gate.
Historical Chromium and Rust evidence is identified as historical.
"""
import json
import re
from collections import Counter
from pathlib import Path

from kapsam import CONTRACTS, source_contract_contains

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
features = json.loads((HERE / "inventory.json").read_text(encoding="utf-8"))
headless = json.loads((HERE / "headless.json").read_text(encoding="utf-8"))
assert set(CONTRACTS) == set(range(1, len(features) + 1))
coverage = {}
missing = []
for index, item in enumerate(features, 1):
    path, tokens, proof = CONTRACTS[index]
    source = (ROOT / path).read_text(encoding="utf-8-sig")
    absent = [token for token in tokens if not source_contract_contains(source, token)]
    for token in absent:
        missing.append({"feature": item["name"], "file": path, "token": token})
    candidates = [ROOT / "windows/tests" / proof, ROOT / "tests" / proof, HERE / proof]
    if proof == "source_hashes.json":
        candidates.append(ROOT / "docs/kanit/kurtarma_source_hashes.json")
    proof_exists = any(p.is_file() for p in candidates)
    status = "KALDI" if absent or not proof_exists else "GEÇTİ"
    note = ("olası hata: eksik kaynak belirteci: " + ", ".join(absent)) if absent else (
        "olası hata: davranış kanıtı dosyası eksik: " + proof if not proof_exists else
        "Yalnız kaynak belirteçleri ve kanıt dosyasının varlığı doğrulandı; "
        "Windows çalışma zamanı bu turda çalıştırılmadı. Davranış referansı: " + proof)
    coverage[item["name"]] = {"status": status, "kind": "Kurtarma kaynak sözleşmesi",
                             "evidence": path, "note": note}

def fail(name, paths, token, note):
    coverage[name].update(status="KALDI", note="olası hata: " + note)
    for path in paths:
        missing.append({"feature": name, "file": path, "token": token})

services = ["windows/src-tauri/src/servis.rs", "windows/src/sistem/servis.ts"]
service_source = "\n".join((ROOT / p).read_text(encoding="utf-8-sig") for p in services)
absent_services = [s for s in ("vercel", "n8n", "stripe", "notion")
                   if not re.search(r'["\x27]' + s + r'["\x27]', service_source, re.I)]
if absent_services:
    fail("E7 Servis pill'leri", services, ", ".join(absent_services),
         "Servis uygulamalarında bulunmayan hizmetler: " + ", ".join(absent_services))
orkestra = "windows/src-tauri/src/orkestra.rs"
source = (ROOT / orkestra).read_text(encoding="utf-8-sig")
before_spawn = source.split("pub async fn orkestra_send", 1)[1].split("cmd.spawn()", 1)[0]
if not (re.search("codex", before_spawn, re.I) and re.search(r'return\s+Err|Err\(', before_spawn)):
    fail("Orkestra: manuel ajan seçimi ve iş verme", [orkestra], "Codex rejection before cmd.spawn()",
         "orkestra_send içinde cmd.spawn öncesi Codex ret kontrolü eksik.")
identity = "windows/src-tauri/src/kimlik.rs"
if not re.search(r"secret\.len\(\)\s*>\s*2560\b", (ROOT / identity).read_text(encoding="utf-8-sig")):
    fail("E11 Credential Manager", [identity], r"secret.len\(\) > 2560",
         "Kaynak sözleşmesindeki kimlik bilgisi boyut sınırı bulunamadı.")
info = [r for r in headless["results"] if r["name"] == "bilgi"]
assert len(info) == 1
if not info[0]["passed"]:
    for name in ("Context göstergesi", "Maliyet bilgisi"):
        coverage[name].update(status="KALDI", evidence="docs/kanit/tum_test/headless.json",
                              note="olası hata: bilgi başsız kabul senaryosu başarısız: " + "; ".join(info[0]["errors"]))

lines = ["# Kurtarma sonrası 77 özellik kanıt raporu", "",
         "GEÇTİ yalnız satırdaki kaynak sözleşmesini kapsar. Windows/Vitest bu turda çalıştırılmadı.",
         "headless.json ve görüntüler önceki üreticinin gerçek çıktılarıdır; yeniden üretilmiş gibi sunulmaz.",
         "cargo.log ajan kaydından kurtarılan tarihli çıktı parçalarıdır; tam veya güncel Rust koşusu değildir.",
         "Güncel Python sonuçları ../pytest_onar2_son.log dosyasındadır. Eksik Windows kodu değiştirilmedi.", "",
         "| Özellik | Test türü | Sonuç | Kanıt dosyası | Not |",
         "| --- | --- | --- | --- | --- |"]
for name, row in coverage.items():
    assert (ROOT / row["evidence"]).is_file()
    note = row["note"].replace("|", "\\|")
    lines.append(f"| {name} | {row['kind']} | {row['status']} | {row['evidence']} | {note} |")
counts = Counter(row["status"] for row in coverage.values())
lines.extend(["", "Kaynak kontrolü sayıları: " + str(dict(counts))])
(HERE / "coverage.json").write_text(json.dumps(coverage, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(HERE / "rapor.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
(ROOT / "docs/kanit/windows_eksik_ozellikler.json").write_text(
    json.dumps(missing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(dict(counts))
