// Local development-only fixture. This file is not a production build entry.
import "../src/style.css";
import { State } from "../src/core/state";
import { Island } from "../src/island/island";
import { kartOlustur, sorulariAyikla } from "../src/question/question";

if (!import.meta.env.DEV) throw new Error("The preview fixture is development-only");

const caseName = new URLSearchParams(location.search).get("case") ?? "idle";
const statuses: Record<string, string> = {
  working: "Calisiyor", waiting: "Bekliyor", paused: "Duraklatildi",
  success: "Tamamlandi", error: "Hata", quota: "Hata", petit: "Calisiyor", hidden: "Calisiyor",
  stale: "Calisiyor", "quota-panel": "Calisiyor", busy: "Calisiyor", "hata-karti": "Hata",
};
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const task = (id: string, agent: string, status: string, title: string, progress: number | null = null, extra: Record<string, unknown> = {}) => ({
  id, agent, task: title, repo: "AfuNobet", status,
  file: "C:\\private\\workspace\\state.ts", progress,
  updated_at: ago(1),
  quota: { remaining_percent: agent === "codex" ? 42 : null, reset_at: "2026-10-02T00:00:00Z" },
  mesaj: caseName === "quota" ? "HTTP 429 PID 9230 secret traceback" : "",
  ...extra,
});
let value: unknown = { version: 1, tasks: [], mesaj: "" };
if (caseName === "disconnected") value = null;
else if (statuses[caseName]) {
  const tasks = [task("focus", "codex", statuses[caseName], "Afu ekranini hazirla", caseName === "success" ? 100 : 36)];
  if (caseName === "working") tasks.push(
    task("secondary-1", "gemini", "Bekliyor", "Gorev kartlarini kontrol et"),
    task("secondary-2", "glm", "Hazirlaniyor", "Dosya bilgisini duzenle", 12),
    task("secondary-3", "opencode", "Tamamlandi", "Arayuz testlerini tamamla", 100),
    task("secondary-4", "codex", "Bekliyor", "Ajan rozetlerini duzenle"),
    task("secondary-5", "gemini", "Bekliyor", "Animasyonlari incele"),
    task("locked", "claude", "Calisiyor", "BU BASLIK GORUNMEMELI"),
  );
  if (caseName === "busy") {
    // The reported archive problem: a long finished history behind a little
    // live work. Nothing here may reach the main screen except the live work.
    for (let index = 0; index < 231; index++) {
      tasks.push(task(`eski-${index}`, index % 2 ? "codex" : "gemini",
        index % 3 ? "Tamamlandi" : "Hata", `Eski kayit ${index}`, 100, { updated_at: ago(60 * 24 * 9) }));
    }
    tasks.push(
      task("duraklatan-1", "codex", "Duraklatildi", "Commit ayiristir"),
      task("duraklatan-2", "gemini", "Duraklatildi", "AjAN denetim"),
      task("duraklatan-3", "glm", "Duraklatildi", "Renk cubugu"),
      task("duraklatan-4", "opencode", "Duraklatildi", "Kota paneli"),
    );
  }
  if (caseName === "hata-karti") tasks.length = 1;
  value = { version: 1, tasks, mesaj: "" };
}

const root = document.getElementById("root")!;
const island = new Island(root);

// Q1 kanıtı: 300+ karakterlik görev adı (boşluksuz uzun kelime) ve ondan türeyen
// ajan mesajı balonu. Görev adı protokolde URL/uzun yol eleniyor; uzun URL örneği
// sohbet ve soru kartında kullanılır.
const UZUN_URL = "https://ornek.afunobet.local/raporlar/2026/10/03/otomatik-kalite-guvenlik-ve-dogrulama-raporu-ayrinti-belge-indir-baglantisi";
const UZUN_AD = `Uzun görev adı: cokbirkicikkelimebirliktebitenboybosluksunuzveryverylongsinglewordtoken ve ${"ayrıntı kelimesiyle uzun bir görev açıklaması ".repeat(12)}`;
if (caseName === "uzun") {
  island.applySnapshot({ version: 1, tasks: [task("focus", "codex", "Calisiyor", UZUN_AD)], mesaj: "" });
  // İkinci anlık görüntü görevi bitirir: gerçek akıştan balon mesajı doğar.
  island.applySnapshot({ version: 1, tasks: [task("focus", "codex", "Tamamlandi", UZUN_AD, 100)], mesaj: "" });
} else island.applySnapshot(value);
State.setFocus("focus");
if (caseName === "success") State.announce("happy");
if (caseName === "error" || caseName === "hata-karti") State.announce("error");
if (caseName === "petit") island.fsm.forcePetit();
else if (caseName === "hidden") island.fsm.forceHidden();
else if (caseName === "selam") island.fsm.launch();
else island.fsm.forceHome();
if (caseName === "stale") island.applySnapshot(null);
if (caseName === "quota-panel") island.setView("quota");

// P9 kanıtı: uzun soru + 4 seçenek + serbest metin alanı (alt menü gizliyken).
if (caseName === "soru") {
  const kap = document.querySelector<HTMLElement>(".soru-kap");
  const [soru] = sorulariAyikla([{
    id: "q-p9", ajan: "claude", tur: "soru", baslik: "Kullanıcı Onayı Gerekiyor",
    metin: "src-tauri ve windows dizinlerindeki derleme ayarlarını güncelleyip eski önbellek dosyalarını temizlemek üzeresiniz. Bu işlem bağımlılıkları yeniden indirebilir (yaklaşık 150 karakterlik uzun soru metni).",
    ayrinti: "cargo clean && npm cache clean --force\n# force clean (Desktop\\afuproject\\AfuNobet-UI)",
    secenekler: [{ id: "evet", etiket: "Evet, devam et" }, { id: "hayir", etiket: "Hayır, iptal" }, { id: "once", etiket: "Önce planı göster" }, { id: "diger", etiket: "Farklı bir yol var" }],
    serbestMetin: true, gizli: false,
    olusturma: Date.now(), sonGecerlilik: Date.now() + 3600_000,
  }], Date.now());
  // Q3: gerçek akış `atla` verir (katman + görünür ✕); kanıt da onu kullanır.
  if (kap && soru) { kap.hidden = false; kap.append(kartOlustur(document, soru, async () => {}, 1, undefined, () => {})); }
}

// Q1 kanıtı: çok uzun soru başlığı + metni (tam metin title'da).
if (caseName === "uzun-soru") {
  const kap = document.querySelector<HTMLElement>(".soru-kap");
  const [soru] = sorulariAyikla([{
    id: "q-q1", ajan: "claude", tur: "soru", baslik: UZUN_AD,
    metin: `${UZUN_AD}\n${UZUN_URL}`,
    ayrinti: "cargo clean --release",
    secenekler: [{ id: "evet", etiket: `Evet, devam et ${"ve çok uzun seçenek açıklaması ".repeat(6)}` }, { id: "hayir", etiket: "Hayır, iptal" }],
    serbestMetin: true, gizli: false,
    olusturma: Date.now(), sonGecerlilik: Date.now() + 3600_000,
  }], Date.now());
  if (kap && soru) { kap.hidden = false; kap.append(kartOlustur(document, soru, async () => {}, 1)); }
}

// Q3 kanıtı: sohbet yüzeyi — kısa bir ajan yanıtı, kapat düğmesi ve alt menü.
if (caseName === "sohbet") {
  island.setView("chat");
  island.chat.onEvent({ method: "turn/started", params: { threadId: "q3", turnId: "q3-t1" } });
  island.chat.onEvent({ method: "item/agentMessage/delta", params: { threadId: "q3", turnId: "q3-t1", delta: "Kart 1,5 katına çıkarıldı; ölçümler 1366x768 ve 1280x720 @%150 altında sığdı." } });
}

// Q1 kanıtı: sohbette çok uzun yanıt (kırpılır, tam metin title'da).
if (caseName === "uzun-sohbet") {
  island.setView("chat");
  island.chat.onEvent({ method: "turn/started", params: { threadId: "q1", turnId: "q1-t1" } });
  island.chat.onEvent({ method: "item/agentMessage/delta", params: { threadId: "q1", turnId: "q1-t1", delta: `${UZUN_AD}\n${UZUN_URL}\n${UZUN_AD}\n${UZUN_URL}\n${UZUN_AD}` } });
}

Object.assign(window, { afuTest: { island, State } });
document.documentElement.dataset.case = caseName;
document.documentElement.dataset.ready = "true";

// M6: Kepenk kart ve ense hover testi
if (caseName === "m6-orkestra") {
  island.fsm.forceHome();
  // Expanded mode with working status to show full card
  island.applySnapshot({ version: 1, tasks: [task("focus", "codex", "Calisiyor", "Orkestra projesini duzenle", 45)], mesaj: "" });
  island.setView("orkestra");
}
if (caseName === "m6-pet-hover") {
  island.fsm.forceHome();
  // Trigger pet hover animation
  island.applySnapshot({ version: 1, tasks: [task("focus", "codex", "Calisiyor", "Pet hover testi", 50)], mesaj: "" });
  if (island.pet) {
    // Schedule hover on after page is rendered
    setTimeout(() => island.pet.hover(true), 1500);
  }
}
