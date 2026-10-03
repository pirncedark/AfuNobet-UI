# AFUNOBET-UI TESLİM PROSEDÜRü (gemini için)

## Ortam Bilgileri
- Çalışma dizini: C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI
- Log dosyası: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\log\gemini_teslim_anim.log
- Çıktı dosyası: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\SONUC_TESLIM_ANIM.md
- GUI açma, commit/push yapma, Claude çağırma YOK

## ADIM 1: Testleri Çalıştır (Sırasıyla)

### 1A. TypeScript Kontrolü (windows/ dizininde)
```
node node_modules/typescript/bin/tsc --noEmit
```
BAŞARISIZSIZSA: Hatayı tam olarak al, çıktı dosyasına yaz, SONUC: DURDU yaz, dur.

### 1B. NPM Testleri (windows/ dizininde)
```
npm test
```
BAŞARISIZSIZSA: Hatayı tam olarak al, çıktı dosyasına yaz, SONUC: DURDU yaz, dur.

### 1C. Cargo Testleri (windows/src-tauri/ dizininde) - TAMAMI
```
cargo test --offline
```
BAŞARISIZSIZSA: Hatayı tam olarak al, çıktı dosyasına yaz, SONUC: DURDU yaz, dur.

### 1D. Python Testleri (proje kökünde)
```
python -m pytest -q tests
```
BAŞARISIZSIZSA: Hatayı tam olarak al, çıktı dosyasına yaz, SONUC: DURDU yaz, dur.

## ADIM 2: TÜM TESTLER TEMIZSE

### 2A. Eski Exe'yi Yedekle
1. C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\dist\afunobet-ui-coucou.exe dosyası
2. Bunu C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\dist\onceki\ klasörüne taşı
3. GERI_AL.ps1 kalmalı (silme)
4. KILITLI UYARI: Eğer exe açık/kilitli ise: Hata yaz "uygulama açık, kapatılması gerek", SONUC: DURDU yaz, dur. Uygulamayı kapatmaya çalışma.

### 2B. Yeni Exe Derle (windows/ dizininde)
```
npm --offline run pack
```
BAŞARISIZSIZSA: Hatayı tam olarak al, çıktı dosyasına yaz, SONUC: DURDU yaz, dur.

### 2C. Yeni Exe'yi Konumla
1. Derleme sonucu oluşan exe dosyasını bul (genellikle windows/dist/ içinde)
2. Bunu C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\dist\afunobet-ui-coucou.exe olarak taşı

### 2D. Kısayol Güncelle (proje kökünde)
```
powershell -NoProfile -File kisayol_guncelle.ps1
```
BAŞARISIZSIZSA: Hatayı tam olarak al, çıktı dosyasına yaz, SONUC: DURDU yaz, dur.

### 2E. SHA256 ve Bilgileri Hesapla
1. Yeni exe'nin SHA256 hash'ini hesapla
2. Dosya boyutunu al (bytes)
3. Tarih ve saat al
4. Bunları not et

## ADIM 3: Çıktı Dosyasını Oluştur

Dosya: C:\Users\afuuu\Desktop\afuproject\_gorev\20261002\SONUC_TESLIM_ANIM.md

### Başarılı (Tüm testler temiz):
```
SONUC: TESLIM_EDILDI
Tarih: YYYY-MM-DD HH:MM:SS
SHA256: [hash değeri]
Boyut: [bytes]
```

### Başarısız (Herhangi bir test/işlem hata):
```
SONUC: DURDU
Neden: [kısa açıklama]
Hata: [tam hata mesajı]
```

## Kural Özeti
- BİR TEST KALIRSA DUR
- EXE KİLİTLİ İSE DUR, KAPATTIRMA
- TÜMLÜK: Yapılan her işlemi log et
- ÇIKTI: SONUC: TESLIM_EDILDI veya SONUC: DURDU ile başlayan MD dosyası
