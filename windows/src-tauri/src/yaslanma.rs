//! R2: mini petin dinlenme yeri (saf hesap, başsız test edilir).
//!
//! Kural: petin bulunduğu ekranda altta duran, görünür bir görev çubuğu varsa
//! pet Başlat düğmesinin yanına, çubuğun üstüne yaslanır (eski davranış).
//! Görev çubuğu bu ekranda değilse (ikinci monitör), otomatik gizliyse ya da
//! üstte/yanda duruyorsa pet o ekranın EN ALTINA yaslanır. Her durumda pet
//! çalışma alanının içinde kalır, ekrandan taşmaz.

use crate::taskbar::{pet_konumu, Cubuk, Kenar};

/// (sol, üst, sağ, alt) — fiziksel piksel.
pub type Dikdortgen = (i32, i32, i32, i32);

/// Başlat düğmesi yokken petin sol kenardan uzaklığı.
const SOL_PAY: i32 = 24;

/// Dikdörtgenin merkezi ekranın içinde mi? (Çubuk/Başlat hangi ekranda?)
fn ekranda(r: Dikdortgen, ekran: Dikdortgen) -> bool {
    let (cx, cy) = ((r.0 as i64 + r.2 as i64) / 2, (r.1 as i64 + r.3 as i64) / 2);
    cx >= ekran.0 as i64 && cx < ekran.2 as i64 && cy >= ekran.1 as i64 && cy < ekran.3 as i64
}

/// Çalışma alanı bozuk gelirse (boş ya da ekranın dışında) ekranın kendisi kullanılır.
fn guvenli_calisma(ekran: Dikdortgen, calisma: Dikdortgen) -> Dikdortgen {
    let gecerli = calisma.2 > calisma.0 && calisma.3 > calisma.1
        && calisma.0 >= ekran.0 && calisma.1 >= ekran.1 && calisma.2 <= ekran.2 && calisma.3 <= ekran.3;
    if gecerli { calisma } else { ekran }
}

/// Petin sol-üst köşesi. `ekran` monitörün tamamı, `calisma` görev çubukları
/// çıkarılmış alanı, `cubuk` ana görev çubuğu, `baslat` Başlat düğmesidir.
pub fn pet_yeri(ekran: Dikdortgen, calisma: Dikdortgen, cubuk: Option<&Cubuk>, baslat: Option<Dikdortgen>, w: i32, h: i32) -> (i32, i32) {
    let alan = guvenli_calisma(ekran, calisma);
    let cubuk = cubuk.filter(|c| ekranda(c.rect, ekran));
    let baslat = baslat.filter(|r| ekranda(*r, ekran));
    if let Some(c) = cubuk {
        if matches!(c.kenar, Kenar::Alt) && !c.oto_gizli {
            return pet_konumu(c, baslat, w, h, alan);
        }
    }
    // Yaslanacak görev çubuğu yok: ekranın en altı. Otomatik gizli alt çubukta
    // Başlat'ın hizası korunur; aksi halde sol kenardan biraz içeride durur.
    let alt_baslat = cubuk.is_some_and(|c| matches!(c.kenar, Kenar::Alt));
    let x = match baslat { Some(r) if alt_baslat => r.0 - w, _ => alan.0 + SOL_PAY };
    let y = alan.3 - h;
    (x.clamp(alan.0, (alan.2 - w).max(alan.0)), y.clamp(alan.1, (alan.3 - h).max(alan.1)))
}

#[cfg(test)]
mod tests {
    use super::*;

    const EKRAN: Dikdortgen = (0, 0, 1920, 1080);
    fn cubuk(rect: Dikdortgen, kenar: Kenar, oto_gizli: bool) -> Cubuk { Cubuk { rect, kenar, oto_gizli } }
    fn icinde(p: (i32, i32), w: i32, h: i32, alan: Dikdortgen) -> bool {
        p.0 >= alan.0 && p.1 >= alan.1 && p.0 + w <= alan.2 && p.1 + h <= alan.3
    }

    #[test]
    fn alt_cubukta_baslatin_yanina_yaslanir() {
        let c = cubuk((0, 1032, 1920, 1080), Kenar::Alt, false);
        let p = pet_yeri(EKRAN, (0, 0, 1920, 1032), Some(&c), Some((780, 1032, 828, 1080)), 256, 256);
        assert_eq!(p, (780 - 256, 1032 - 256));
    }

    #[test]
    fn cubuk_hic_yoksa_ekranin_en_altinda() {
        let p = pet_yeri(EKRAN, EKRAN, None, None, 256, 256);
        assert_eq!(p, (24, 1080 - 256));
    }

    #[test]
    fn ustteki_cubukta_ekranin_en_altina_iner() {
        let c = cubuk((0, 0, 1920, 48), Kenar::Ust, false);
        let p = pet_yeri(EKRAN, (0, 48, 1920, 1080), Some(&c), Some((780, 0, 828, 48)), 256, 256);
        assert_eq!(p, (24, 1080 - 256));
    }

    #[test]
    fn soldaki_ve_sagdaki_cubukta_ekranin_en_altina_iner() {
        let c = cubuk((0, 0, 48, 1080), Kenar::Sol, false);
        let p = pet_yeri(EKRAN, (48, 0, 1920, 1080), Some(&c), Some((0, 20, 48, 68)), 256, 256);
        assert_eq!(p, (48 + 24, 1080 - 256));
        let c = cubuk((1872, 0, 1920, 1080), Kenar::Sag, false);
        let p = pet_yeri(EKRAN, (0, 0, 1872, 1080), Some(&c), Some((1872, 20, 1920, 68)), 256, 256);
        assert_eq!(p, (24, 1080 - 256));
        assert!(icinde(p, 256, 256, (0, 0, 1872, 1080)));
    }

    #[test]
    fn otomatik_gizli_cubukta_en_altta_baslat_hizasinda() {
        let c = cubuk((0, 1032, 1920, 1080), Kenar::Alt, true);
        let p = pet_yeri(EKRAN, EKRAN, Some(&c), Some((780, 1032, 828, 1080)), 256, 256);
        assert_eq!(p, (780 - 256, 1080 - 256));
        // Başlat bulunamazsa yine en altta, soldan biraz içeride.
        assert_eq!(pet_yeri(EKRAN, EKRAN, Some(&c), None, 256, 256), (24, 1080 - 256));
    }

    #[test]
    fn yuzde_150_olcekte_alt_kenar_ve_sinirlar_dogru() {
        // 2880x1620 fiziksel ekran (%150), pet 384 px, çubuk 72 px.
        let ekran = (0, 0, 2880, 1620);
        let c = cubuk((0, 1548, 2880, 1620), Kenar::Alt, false);
        let p = pet_yeri(ekran, (0, 0, 2880, 1548), Some(&c), Some((1170, 1548, 1242, 1620)), 384, 384);
        assert_eq!(p, (1170 - 384, 1548 - 384));
        let gizli = cubuk((0, 1548, 2880, 1620), Kenar::Alt, true);
        let p = pet_yeri(ekran, ekran, Some(&gizli), None, 384, 384);
        assert_eq!(p, (24, 1620 - 384));
        // Başlat ekranın en solundaysa pet sol kenardan taşmaz.
        let p = pet_yeri(ekran, (0, 0, 2880, 1548), Some(&c), Some((10, 1548, 82, 1620)), 384, 384);
        assert_eq!(p, (0, 1548 - 384));
    }

    #[test]
    fn ikinci_monitor_negatif_koordinatta_ana_cubugu_kullanmaz() {
        // Pet solda (-1920..0) ikinci monitörde; görev çubuğu ve Başlat ana ekranda.
        let ekran = (-1920, 0, 0, 1080);
        let ana = cubuk((0, 1032, 1920, 1080), Kenar::Alt, false);
        let p = pet_yeri(ekran, ekran, Some(&ana), Some((780, 1032, 828, 1080)), 256, 256);
        assert_eq!(p, (-1920 + 24, 1080 - 256));
        assert!(icinde(p, 256, 256, ekran));
        // Ana ekranın üstündeki (negatif y) ikinci monitör.
        let ust = (0, -1080, 1920, 0);
        let p = pet_yeri(ust, ust, Some(&ana), Some((780, 1032, 828, 1080)), 320, 320);
        assert_eq!(p, (24, -320));
    }

    #[test]
    fn ikinci_monitorun_kendi_cubugu_varsa_ustunde_durur() {
        // Windows 11 ikinci ekran çubuğu çalışma alanını kısaltır; pet onun üstünde kalır.
        let ekran = (1920, 0, 3840, 1080);
        let ana = cubuk((0, 1032, 1920, 1080), Kenar::Alt, false);
        let p = pet_yeri(ekran, (1920, 0, 3840, 1032), Some(&ana), None, 256, 256);
        assert_eq!(p, (1920 + 24, 1032 - 256));
    }

    #[test]
    fn bozuk_calisma_alani_ve_kucuk_ekran_tasmaz() {
        let p = pet_yeri(EKRAN, (0, 0, 0, 0), None, None, 256, 256);
        assert_eq!(p, (24, 1080 - 256));
        let kucuk = (0, 0, 200, 150);
        let p = pet_yeri(kucuk, kucuk, None, None, 256, 256);
        assert_eq!(p, (0, 0));
    }

    #[test]
    fn her_durumda_ekrandan_tasmaz() {
        let ekranlar = [(0, 0, 1920, 1080), (-1920, 0, 0, 1080), (0, -1080, 1920, 0), (-2560, -300, 0, 1140)];
        for ekran in ekranlar {
            for (kenar, gizli) in [(Kenar::Alt, false), (Kenar::Alt, true), (Kenar::Ust, false), (Kenar::Sol, false), (Kenar::Sag, false)] {
                for size in [256, 320, 384] {
                    let c = cubuk((0, 1032, 1920, 1080), kenar, gizli);
                    let p = pet_yeri(ekran, ekran, Some(&c), Some((780, 1032, 828, 1080)), size, size);
                    assert!(icinde(p, size, size, ekran), "{:?} {:?} {}", ekran, p, size);
                }
            }
        }
    }
}
