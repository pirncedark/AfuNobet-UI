# UI/UX doğrulama ve teslim

Üst kenara gelince panel tekrar açılır; fare panelden ayrılınca mini pete döner. Petten dönüş 750 ms yerine 240 ms, kart genişlemesi 70 ms sürer. Panel genişliği görünür metne göre hesaplanır. Native pencere, içeriğin doğal yüksekliğini gerçek zoom/DPI dönüşümüyle kullanır ve monitör yüksekliğinin %85'ini aşmaz. Kontroller sabit kalır; uzun içerik kendi gövdesinde kayar. Ana düğme sığmadığında yeni satıra geçer. Pet, panel ve sohbet maskotları ortak 170 native mantıksal piksel hedefine bağlanmıştır.

## Bulunan ve düzeltilen sorunlar

- Gizli/pet durumunda cursor poll park ettiği için üst kenardan geri açılma çalışmıyordu. Düşük sıklıklı kenar algısı ve tam panel wake-up eklendi.
- Tasarım yüksekliği native pencereye zoom uygulanmadan gönderildiği için kontrol satırı kırpılıyordu. Gerçek client sınırı ve native dönüşüm düzeltildi.
- Footer kutusu sığsa da ana düğmesi dışarı taşıyordu. Alt satır artık gerektiğinde sarılır.
- JavaScript inline grid kuralı dar ekrandaki tek kolon düzenini bozuyordu. Normal kolon genişliği CSS değişkeniyle aktarılır.
- Native/WebView DPI farkında maskotlar eşit görünmüyordu. Görünür alfa kutuları ve sohbet maskotu aynı mantıksal hedefe bağlandı.
- Flex gövdesinin ayrılan yüksekliği doğal içerik sanılıp pencere art arda küçülüyordu. Aynı genişlikte auto-height ölçüm kopyası doğal içeriği ölçer ve maskot boyunu miras alır.
- Aynı Tauri command makrosu iki kez tanımlanmıştı; native helper normal fonksiyon, wrapper tek komut route'u olarak bırakıldı.
- QA fake style, balon raster karşılaştırması ve IPC ACK sıralaması düzeltildi. Testler atlanmadı; üretim IPC değişmedi.
- Uzun sohbet fixture'ı gerçek ChatModel metnini ve dikey scroll'u doğrular; boş fallback ekranıyla PASS vermez.

## Doğrulama

- Frontend: 82 dosya, 962 test PASS; TypeScript kontrolü PASS.
- Rust: 286 test PASS, 9 mevcut ignored; normal paralel harness. IPC hedef testi 5/5 tekrar PASS.
- Chromium native-branch QA: 13 kombinasyon, kısa/uzun apps ve sohbet; 420/640/850/1080 CSS genişlik, DPR 1/1.25/1.5 ve native 1 / WebView 1.32 farkı. Footer, yatay taşma, uzun yanıt, scroll ve maskot sınırı kontrol edildi.
- Genel preview taraması: 15 ekran × 4 ölçü = 60 kombinasyon, 0 sorun. %100/%150 ve 420/640 genişlik. Görseller ayrıca incelendi.
- Python ve son EXE teslim sonucu aşağıya eklenecek.

Gerçek Windows/WebView2 hover ve çoklu monitör etkileşimi henüz elle doğrulanmadı. Tarayıcı/native-mock testleri bu kabulün yerine geçmez. Yerel test logları ve ekran görüntüleri windows/test-results altında tutulur; EXE ve yedekler kaynak depoya eklenmez.

## Son teslim

Python: `python -m pytest -q tests -W error` 298 PASS, uyarı yok. Dosya okuma fake'i transient kilit yarışlarını bounded retry ile yönetir ve cevaplanmış dosyayı tekrar açmaz; hedefli test 10/10 tur geçti.

Release build Exit0. Masaüstü AfuNobet UI kısayolu `dist/afunobet-ui-20261004-091321.exe` dosyasına güncellendi. Kaynak/teslim SHA256 eşitliği ve kısayol hedefi doğrulandı. Boyut 36.879.872 bayt; SHA256 `909B0D6962717A1FF332A168AE46ECFEA567F9FFB1DEF160A98BA97C19A3FDE2`. Önceki EXE ve kısayol yedeği korunur. Manifest: `dist/uiux-build-manifest.json`.

Kaynak teslim dalı: `fix/uiux-hover-panel-fit-20261004`. GitHub push sonucu ayrıca bildirilecektir.
