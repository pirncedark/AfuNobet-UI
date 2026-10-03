# Yerel Codex protokolü

Şemalar yerel resmi npm Codex Windows x64 ikilisinin `app-server generate-json-schema` çıktısıdır (2026-10-01). Gerçek kullanıcı mesajı, login veya token okunmadı; çıktı yalnız protokol tanımıdır.

Initialize: `clientInfo.name/version`, `capabilities.experimentalApi=false`; yanıt sonrası id olmadan `initialized`.
Thread: `cwd` mevcut mutlak dizin; `sandbox=read-only`, `approvalPolicy=never`, `ephemeral=true`. Turn: `input` text veya localImage; `sandboxPolicy.type=readOnly`, `networkAccess=false`. Thread/turn için kimlikler sunucu yanıtından alınır.
Account: `account/read` ve `refreshToken=false`; yalnız `type=chatgpt` hazır sayılır. UI yalnız loggedIn, planType, kota yüzdesi/pencere süresi/reset zamanı görür. Kimlik, e-posta, kredi, auth alanları yayımlanmaz.
Login: kullanıcı eylemiyle `account/login/start` type=chatgpt; authUrl yalnız resmi HTTPS auth.openai.com adresi olarak açılabilir. `account/login/cancel` loginId; turn iptali `turn/interrupt` threadId/turnId.
Çerçeveleme: UTF-8 satır başına JSON, en çok 1 MiB. Request id korelasyonu, 30 sn zaman aşımı, EOF bekleyen istekleri kapatır. Sunucu araç/izin istekleri hata ile reddedilir. Köprü child ve okuyucu için Mutex<Option> tutar; uygulama kapanırken açıkça shutdown() çağrılır. Yaşayan Arc kopyaları bu kapanışı engellemez. shutdown idempotenttir, bekleyen istekleri kapatır ve yalnız sahip olduğu child üzerinde kill+wait yapar; Drop da aynı metodu çağırır.

Başlangıçta köprü başlatılmaz. Açık sohbet eylemiyle salt okunur durum sorgusu veya Gönder/Oturum aç köprüyü tembel başlatır. Gerçek Windows konsolsuz başlangıç/kapanış, OAuth ve canlı yanıt smoke testi kullanıcı testinde UNVERIFIED kalır.
Akış kimlikleri: delta `threadId/turnId/itemId` taşır; turn olayları `threadId/turn.id` taşır; error `threadId/turnId/willRetry` taşır. EOF sentetik hata olayı temizlenmeden önce aktif thread/turn kimliklerini alır. Ham hata alanları yayımlanmaz.

Araç mirası kapısı (2026-10-01): yerel resmi npm ikilisi codex-cli 0.159.2 ile normal ve --experimental generate-json-schema karşılaştırıldı. ConfigReadParams includeLayers/cwd, ConfigReadResponse layers[].config ve ThreadStartParams config haritası kullanılıyor. dynamicTools/environments yalnız experimental şemada bulunduğu için experimentalApi=false akışına eklenmez; dar test gönderilen tüm thread alanlarını depodaki stabil şemayla eşleştirir.

Başlangıç CLI override ve thread config seviyesinde features.shell_tool, features.unified_exec, features.plugins, features.enable_mcp_apps kapalı; web_search=disabled. thread/start öncesinde config/read(includeLayers=true,cwd) zorunludur. Etkili config ve tüm katmanlardaki mcp_servers/app kimlikleri tek tek enabled=false olur; apps._default da kapalıdır. Boş mcp_servers tablosu mirası temizledi varsayılmaz. Okuma hatası veya bozuk katman yapısı thread başlamadan hata verir. Bu dönüşüm yalnız kimlikleri alır; config içindeki sırları UI veya loga taşımaz, hesap config dosyasını değiştirmez. Sunucudan araç/izin istekleri ayrıca reddedilir; developerInstructions tek başına güvenlik sınırı sayılmaz.

Anahtar kanıtı: aynı yerel CLI ikilisinin gömülü ConfigToml/feature/MCP enabled alanları ve [resmî yapılandırma referansı](https://developers.openai.com/codex/config-reference). Protokol tanımları kaynak olarak yerel üretilen şemalardır. Gerçek model veya MCP oturumu çalıştırılmadığı için canlı sağlayıcı davranışı UNVERIFIED kalır.

Son dar doğrulama: cargo test --test codex_protocol → 18 PASS, 1 ignored fixture; cargo check → PASS. Owned-child testi yalnız mevcut Rust test binary'sinin gizli fixture sürecini açar, Arc kopyası tutulurken shutdown'ın bu süreci sonlandırmasını ve okuyucu EOF'unu doğrular. Codex app-server, gerçek kullanıcı mesajı, giriş, mikrofon veya uygulama penceresi açmaz. Ignored fixture yalnız bu testin alt süreç girişidir; ortam işareti yoksa hemen döner.
