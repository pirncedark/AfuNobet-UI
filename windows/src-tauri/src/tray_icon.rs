#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn transparent_corners_and_size() {
        let p = simge(Durum::Calisiyor, 32);
        assert_eq!(p.len(), 32 * 32 * 4);
        assert!(p[3] < 10);
    }
    #[test]
    fn distinct_statuses() { assert_ne!(simge(Durum::Basari, 32), simge(Durum::Hata, 32)); }
}
#[derive(Clone, Copy)]
pub enum Durum { Bos, Calisiyor, Bekliyor, Uyari, Basari, Hata }
impl Durum {
    pub fn parse(s: &str) -> Self { match s { "calisiyor" => Self::Calisiyor, "bekliyor" => Self::Bekliyor, "uyari" => Self::Uyari, "basari" => Self::Basari, "hata" => Self::Hata, _ => Self::Bos } }
}
// Resmi kaynak simge yerelde Pillow ile 32x32 RGBA çözümlendi. Yeni PNG paketi yok.
const BASE: &[u8; 4096] = include_bytes!("../icons/tray-base.rgba");
pub fn simge(durum: Durum, boyut: u32) -> Vec<u8> {
    let n = boyut.clamp(1, 256) as usize;
    let mut pixels = vec![0; n*n*4];
    for y in 0..n { for x in 0..n {
        let source = ((y*32/n)*32+x*32/n)*4;
        let target = (y*n+x)*4;
        pixels[target..target+4].copy_from_slice(&BASE[source..source+4]);
    }}
    let color = match durum { Durum::Bos => None, Durum::Calisiyor => Some([63,153,255,255]), Durum::Bekliyor => Some([145,150,160,255]), Durum::Uyari => Some([255,172,54,255]), Durum::Basari => Some([87,214,125,255]), Durum::Hata => Some([255,82,103,255]) };
    if let Some(color) = color {
        let radius = (n as f64 * 0.16).max(1.0); let centre = n as f64 * 0.78;
        for y in 0..n { for x in 0..n {
            if (x as f64-centre).powi(2)+(y as f64-centre).powi(2) <= radius*radius { pixels[(y*n+x)*4..(y*n+x)*4+4].copy_from_slice(&color); }
        }}
    }
    pixels
}
