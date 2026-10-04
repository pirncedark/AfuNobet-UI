# Açılışı 3 kat hızlandır
ONAY: Kullanıcı 2-3 kat hız istedi. Onay bekleme.
Dizin C:/Users/afuuu/Desktop/afuproject/AfuNobet-UI.
Sahiplik yalnız windows/src-tauri/src/glide.rs, windows/src/afu/timing.ts ve yeni windows/tests/open_speed.test.ts. island.ts/frontend/CSS/lib.rs diğer ajanda; başkalarının değişikliklerini geri alma. Commit/push/indirme/pencere yok.
📍 glide.rs:263 return on=false bekleme320ms; :280 move_segment250ms; :291 sleep180ms => petten panel750ms sonra200-500ms frontend animasyonu. Geri dönüş açılış sürelerini üçte bire indir (yaklaşık100+80+60=240ms). Pet aşağı iniş on=true süreleri aynen kalabilir. Runtime generation/cancel/mode/show akışını koru. Tek kaynak pure timing helper veya constants ile Rust test yaz; return <= eski750/2 ve tercihen250, iniş değişmez. Hareket adım sayısı düzgün en az1.
📍 timing.ts:1 T dizisine panelOpen:70 ve petReturn:240 ms ekle; diğer T sürelerini değiştirme. Diğer ajan island.ts spring response .16/height T.panelOpen ve preview T.petReturn kullanacak.
Hedefli testler çalıştır, gerçek çıktıyı docs/tasks/SONUC_FAST_OPEN.md yaz. EXE build root yapar.
