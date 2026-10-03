import os
import json
import time
import argparse
import shutil
import uuid
from pathlib import Path

SENARYOLAR = ["bos", "codex_soru", "gemini_kota", "hata", "bayat", "codex_kota_gemini_devir"]
YAZILAN_SORULAR = []

def simdi_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def setup_argparse():
    parser = argparse.ArgumentParser(description="AfuNobet-UI Sahte Olay Uretici")
    parser.add_argument("--senaryo", choices=SENARYOLAR, default="codex_soru", help="Oynatilacak senaryo")
    parser.add_argument("--gercek", action="store_true", help="Gercek AFUNOBET_DB klasorune yaz (ONERILMEZ)")
    parser.add_argument("--hedef", type=str, help="Ozel hedef klasor")
    parser.add_argument("--sabit", action="store_true", help="Sabit kimlikler uret (fixture ve test icin)")
    parser.add_argument("--bekleme", type=float, default=1.0, help="Bekleme carpani (0 = bekleme yok)")
    parser.add_argument("--cevap-bekleme", type=float, default=60.0, help="Cevap bekleme suresi (sn, 0 = bekleme yok)")
    parser.add_argument("--oto-cevap", choices=["evet", "hayir"], help="Soruyu arayuz beklemeden bu secimle cevapla")
    parser.add_argument("--fixture", type=str, help="Uretilen dosyalari bu klasore de yaz (uygulama ayristirici testleri)")
    return parser.parse_args()

def get_target_dir(args):
    if args.hedef:
        return Path(args.hedef).resolve()
    
    if args.gercek:
        return Path("C:/Users/afuuu/Desktop/afuproject/AfuNobet")
    
    # Varsayilan test klasoru (AFUNOBET_UI_STATE icin)
    base_dir = Path(__file__).parent.parent
    test_dir = base_dir / "test_durum"
    return test_dir.resolve()

def yeni_id(onek: str, sabit: bool = False) -> str:
    return onek if sabit else f"{onek}-{uuid.uuid4().hex[:8]}"

def uyu(saniye: float, bekleme: float = 1.0):
    if bekleme > 0:
        time.sleep(saniye * bekleme)

def write_state(target_dir: Path, state: dict, dokunma: bool = False):
    state_file = target_dir / "state.json"
    temp_file = target_dir / "state.json.tmp"

    target_dir.mkdir(parents=True, exist_ok=True)
    if not dokunma:
        for task in state.get("tasks", []):
            task["updated_at"] = simdi_iso()

    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    temp_file.replace(state_file)
    print(f"[*] state.json guncellendi (Görev sayısı: {len(state.get('tasks', []))})")

def write_question(target_dir: Path, question_id: str, agent: str, olusturma=None, gecerlilik=None):
    sorular_dir = target_dir / "sorular"
    sorular_dir.mkdir(parents=True, exist_ok=True)
    
    simdi = int(time.time() * 1000)
    question = {
        "surum": 1,
        "id": question_id,
        "ajan": agent,
        "tur": "komut",
        "baslik": "Komut çalıştırılsın mı?",
        "metin": "npm run build",
        "ayrinti": "C:\\proje",
        "secenekler": [
            { "id": "evet", "etiket": "İzin ver" },
            { "id": "hayir", "etiket": "Reddet" }
        ],
        "serbestMetin": False,
        "gizli": False,
        "varsayilan": "hayir",
        "olusturma": simdi if olusturma is None else olusturma,
        "sonGecerlilik": (simdi + 110000) if gecerlilik is None else gecerlilik
    }
    
    temp_file = sorular_dir / f"{question_id}.json.tmp"
    target_file = sorular_dir / f"{question_id}.json"
    
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(question, f, ensure_ascii=False)
    temp_file.replace(target_file)
    YAZILAN_SORULAR.append(question)
    print(f"[*] Soru soruldu: {question_id}")

def write_answer(target_dir: Path, question_id: str, secim: str):
    cevaplar_dir = target_dir / "cevaplar"
    cevaplar_dir.mkdir(parents=True, exist_ok=True)
    cevap = {"surum": 1, "id": question_id, "secim": secim, "metin": None,
             "zaman": int(time.time() * 1000), "kaynak": "sahte"}
    temp_file = cevaplar_dir / f"{question_id}.json.tmp"
    target_file = cevaplar_dir / f"{question_id}.json"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(cevap, f, ensure_ascii=False)
    temp_file.replace(target_file)
    print(f"[*] Cevap yazildi: {question_id} -> {secim}")

def wait_for_answer(target_dir: Path, question_id: str, timeout_sec=60):
    cevaplar_dir = target_dir / "cevaplar"
    cevaplar_dir.mkdir(parents=True, exist_ok=True)
    answer_file = cevaplar_dir / f"{question_id}.json"
    
    print(f"[*] Arayüzden cevap bekleniyor (en fazla {timeout_sec} saniye)...")
    start = time.time()
    while True:
        if answer_file.exists():
            with open(answer_file, "r", encoding="utf-8") as f:
                try:
                    answer = json.load(f)
                except json.JSONDecodeError:
                    time.sleep(0.5)
                    continue
            
            print(f"[+] Cevap alindi: {answer.get('secim')}")
            # Soru ve cevap dosyalarini sil
            (target_dir / "sorular" / f"{question_id}.json").unlink(missing_ok=True)
            answer_file.unlink(missing_ok=True)
            return True
        # Dosya bir kez de olsa kontrol edilir; sure 0 "hic bekleme" demektir.
        if time.time() - start >= timeout_sec:
            break
        time.sleep(0.5)
    
    print("[-] Cevap zaman asimina ugradi.")
    return False

def create_base_state():
    return {
        "version": 1,
        "tasks": [],
        "mesaj": "",
        "quotas": {
            "codex": {"remaining_percent": 80},
            "gemini": {"remaining_percent": 90}
        }
    }

def play_bos(target_dir: Path):
    write_state(target_dir, create_base_state())

def play_codex_soru(target_dir: Path, bekleme: float = 1.0, cevap_bekleme: float = 60.0, sabit: bool = False, oto_cevap=None):
    state = create_base_state()
    task_id = yeni_id("task", sabit)
    question_id = yeni_id("codex-soru", sabit)
    
    task = {
        "id": task_id,
        "agent": "codex",
        "status": "Hazirlaniyor",
        "task": "Test senaryosu - Onay Bekliyor",
        "current_action": "Baslatiliyor...",
        "model": "gpt-6",
        "started_at": simdi_iso()
    }
    state["tasks"].append(task)
    write_state(target_dir, state)
    uyu(1, bekleme)
    
    task["status"] = "Calisiyor"
    task["current_action"] = "Islem yapiliyor..."
    write_state(target_dir, state)
    uyu(2, bekleme)
    
    task["status"] = "Bekliyor"
    task["current_action"] = "Kullanici onayi bekleniyor"
    write_state(target_dir, state)
    
    write_question(target_dir, question_id, "codex")
    if oto_cevap:
        write_answer(target_dir, question_id, oto_cevap)
    
    if wait_for_answer(target_dir, question_id, timeout_sec=cevap_bekleme):
        task["status"] = "Calisiyor"
        task["current_action"] = "Cevap alindi, devam ediliyor..."
        write_state(target_dir, state)
        uyu(2, bekleme)
        task["status"] = "Tamamlandi"
        task["current_action"] = "Basariyla tamamlandi"
        write_state(target_dir, state)
    else:
        task["status"] = "Hata"
        task["message"] = "Cevap gelmedi"
        write_state(target_dir, state)

def play_gemini_kota(target_dir: Path, bekleme: float = 1.0, sabit: bool = False):
    state = create_base_state()
    task_id = yeni_id("task", sabit)
    
    task = {
        "id": task_id,
        "agent": "gemini",
        "status": "Calisiyor",
        "task": "Devasa dosya analizi",
        "current_action": "API'ye gonderiliyor...",
        "started_at": simdi_iso()
    }
    state["tasks"].append(task)
    write_state(target_dir, state)
    uyu(2, bekleme)
    
    # 429 hatasi at (UI bunu Duraklatildi yapacak)
    task["status"] = "Hata"
    task["message"] = "429 Too Many Requests: Quota exceeded"
    task["last_error"] = "429 quota"
    task["quota"] = {"remaining_percent": 0}
    state["quotas"]["gemini"] = {"remaining_percent": 0, "checked_at": simdi_iso()}
    write_state(target_dir, state)
    print("[*] Kota hatasi gonderildi, UI tarafinda Duraklatildi olarak gorunmeli.")

def play_hata(target_dir: Path, bekleme: float = 1.0, sabit: bool = False):
    state = create_base_state()
    task_id = yeni_id("task", sabit)
    
    task = {
        "id": task_id,
        "agent": "opencode",
        "status": "Calisiyor",
        "task": "Rastgele hata senaryosu",
        "current_action": "Derleniyor...",
        "started_at": simdi_iso()
    }
    state["tasks"].append(task)
    write_state(target_dir, state)
    uyu(2, bekleme)
    
    task["status"] = "Hata"
    task["message"] = "Dosya bulunamadi: src/main.rs"
    write_state(target_dir, state)

def play_bayat(target_dir: Path, sabit: bool = False):
    state = create_base_state()
    task_id = yeni_id("task", sabit)
    
    task = {
        "id": task_id,
        "agent": "codex",
        "status": "Calisiyor",
        "task": "Sonsuz donguye giren gorev",
        "current_action": "Analiz ediliyor...",
        "started_at": "2020-01-01T00:00:00Z", # Cok eski bir tarih
        "updated_at": "2020-01-01T00:00:00Z"
    }
    state["tasks"].append(task)
    write_state(target_dir, state, dokunma=True)
    print("[*] Bayat (cok eski) gorev yazildi ve cikildi.")

def play_codex_kota_gemini_devir(target_dir: Path, bekleme: float = 1.0, sabit: bool = False):
    state = create_base_state()
    job_id = yeni_id("test", sabit)
    state["tasks"].append({
        "id": "task-" + job_id,
        "job_id": job_id,
        "agent": "codex",
        "task": "Kota devir testi",
        "status": "Calisiyor",
        "handoff": {
            "from": "codex",
            "to": "gemini",
            "reason": "kota_doldu"
        },
        "updated_at": simdi_iso()
    })
    write_state(target_dir, state)

def fixture_yaz(hedef_dir: Path, state: dict, sorular):
    hedef_dir.mkdir(parents=True, exist_ok=True)
    with open(hedef_dir / "state.json", "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    if sorular:
        sorular_dir = hedef_dir / "sorular"
        sorular_dir.mkdir(parents=True, exist_ok=True)
        for soru in sorular:
            with open(sorular_dir / f"{soru['id']}.json", "w", encoding="utf-8") as f:
                json.dump(soru, f, ensure_ascii=False, indent=2)
    print(f"[*] Fixture yazildi: {hedef_dir}")

def main():
    args = setup_argparse()
    target_dir = get_target_dir(args)
    target_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"=== AfuNobet Sahte Olay Uretici ===")
    print(f"Hedef klasor: {target_dir}")
    print(f"Ortam: AFUNOBET_UI_STATE={target_dir / 'state.json'}")
    print(f"        AFUNOBET_SORU_DIZINI={target_dir}")
    print(f"Senaryo: {args.senaryo}")
    print(f"===================================")
    
    YAZILAN_SORULAR.clear()
    if args.senaryo == "bos":
        play_bos(target_dir)
    elif args.senaryo == "codex_soru":
        play_codex_soru(target_dir, bekleme=args.bekleme, cevap_bekleme=args.cevap_bekleme,
                        sabit=args.sabit, oto_cevap=args.oto_cevap)
    elif args.senaryo == "gemini_kota":
        play_gemini_kota(target_dir, bekleme=args.bekleme, sabit=args.sabit)
    elif args.senaryo == "hata":
        play_hata(target_dir, bekleme=args.bekleme, sabit=args.sabit)
    elif args.senaryo == "bayat":
        play_bayat(target_dir, sabit=args.sabit)
    elif args.senaryo == "codex_kota_gemini_devir":
        play_codex_kota_gemini_devir(target_dir, bekleme=args.bekleme, sabit=args.sabit)

    if args.fixture:
        with open(target_dir / "state.json", "r", encoding="utf-8") as f:
            fixture_yaz(Path(args.fixture).resolve(), json.load(f), YAZILAN_SORULAR)

if __name__ == "__main__":
    main()
