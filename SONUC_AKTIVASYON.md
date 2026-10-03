SONUC: TAMAM

### 1. Orkestra "İş Ver" Geri Bildirimi
- `views.ts` içinde `orkestraSend` çağrısı anında `State.setPendingOrkestra` tetiklendi.
- Ana ekranda "Başlıyor..." geçici kartı (`focusTask` üzerinden) oluşturuldu.
- Karakter tepkisi için `announce("working")` (çalışıyor) eklendi.
- 30 saniye içinde `state.json` güncellenmezse tek cümlelik hata (`afu-flash` eventi ile) bildirimi sağlandı.

### 2. Olay Sesleri
- `ses.rs` içinde sesi çalan thread'in Tauri event pool'u ile anında ölmesi sorunu çözüldü (`PlaySoundW` artık `SND_ASYNC` olmadan izole bir thread'de, ses bitene kadar yaşıyor).
- `tray.rs` dosyasına "Sesleri aç/kapat" (Mute) toggle butonu eklendi ve ayar `bildirim::Runtime` ile eşzamanlı olarak kalıcı hale getirildi.
- Sesler (`tamamlandi`, `hata`, `kota`, vs.) olaylara başarıyla bağlandı.

### 3. Afu'ya Sor -> Codex (Ücretsiz Login)
- `sor.ts`'deki buton metni "Codex'e giriş yap" olarak güncellendi (vurgulandı).
- Hazır olma kontrolü yalnızca `"hazir"` metnine değil, güvenli bir şekilde `raw.loggedIn === true` özelliğine bağlandı.
- Test için sahte bir JSON-RPC `mock_codex.exe` programı yazıldı ve `ses_deneme/dene_sohbet.ps1` betiği ile yerel test ortamı hazırlandı.

### 4. Sağlık Şeridi (Health Strip)
- Ana görev kartının hemen altına 4 parametreli (AfuNöbet, Codex, Sesler, Claude) bir sağlık şeridi (`health-strip`) yerleştirildi.
- Tıklama özelliği kazandırıldı: Hata olan modüle göre tek cümlelik yönlendirme ("Codex oturumu yok...", "AfuNöbet kapalı...") eklendi.
- `updateHealth()` ile async `codexStatus` ve `bildirimAyarlari` yormayacak şekilde 5 saniyelik intervale bağlandı.

### 5. AfuNöbet Verisi Gereken (Çözülemeyen) Maddeler
Kodda olup bağlanamayan maddeler incelenmiş ve eksik/gelmeyen `AfuNöbet` verileri aşağıda listelenmiştir (bu kısımlara kod yazılmadı):
1. **Kota/limit paneli:** AfuNobet üzerinden gerçek API kotalarının gelmesi gereklidir.
2. **Model / effort / thinking bilgisi:** Görev kartında çıkacak metrikler AfuNobet tarafından gönderilmemektedir.
3. **Context göstergesi:** Bağlam (token) kullanımı AfuNobet tarafından sağlanmamaktadır.
4. **Maliyet bilgisi:** API harcama/maliyet bilgisi AfuNobet'ten gelmemektedir.
5. **Yerel durum soruları (Soru/Onay kartı):** Köprü betiğinin `sorular/` içine JSON yazması (tam otomatik uçtan uca akış) AfuNobet entegrasyonu gerektirir.
6. **E7 Servis Pill'leri (Vercel):** GitHub CLI ping'i tam çalışıyor ancak Vercel ping kodu bulunmuyor, dış API bilgisi gerekiyor.
