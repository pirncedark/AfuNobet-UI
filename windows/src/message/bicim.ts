export interface SoruSecenegi {
  id: string;
  etiket: string;
}
export interface MesajBicimi {
  tur: "bilgi" | "basari" | "uyari" | "hata" | "soru";
  numaraliMaddeler: { no: string; yazi: string }[];
  baslik: string;
  maddeler: string[];
  ayrinti: string;
  soru: boolean;
  secenekler?: SoruSecenegi[];
}

export function bicimle(text: string | undefined): MesajBicimi {
  if (!text) {
    return { baslik: "", maddeler: [], numaraliMaddeler: [], tur: "bilgi", ayrinti: "", soru: false };
  }

  // Soru algılama (temizlenmeden önce veya sonra yapılabilir)
  let soru = text.includes('❓');
  const secenekler: SoruSecenegi[] = [];

  // "1 = Evet / 2 = Hayır" formatını veya satır satır olanları ayıkla
  const secenekMatch = text.match(/(\d+)\s*=\s*([^/\n]+)/g);
  if (secenekMatch) {
    soru = true;
    for (const match of secenekMatch) {
      const parts = match.split('=');
      if (parts.length >= 2) {
        secenekler.push({ id: parts[0].trim(), etiket: parts.slice(1).join('=').trim() });
      }
    }
  }

  const tur: MesajBicimi["tur"] = soru ? "soru"
    : /❌|hata|başarısız|error/iu.test(text) ? "hata"
    : /⚠|dikkat|uyarı/iu.test(text) ? "uyari"
    : /✅|tamam|geçti|bitti/iu.test(text) ? "basari" : "bilgi";

  // ANSI kodlarını at
  // eslint-disable-next-line no-control-regex
  let cleanText = text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  // Süs çizgilerini at (━, ─, ═ ile oluşan satırlar)
  cleanText = cleanText.replace(/^[━─═\s]+$/gm, '');

  // Markdown işaretlerini at (**, ` ` , #)
  cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '$1');
  cleanText = cleanText.replace(/`(.*?)`/g, '$1');
  cleanText = cleanText.replace(/^#+\s+/gm, '');

  // Fazla boş satırları sıkıştır
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n');
  const ayrinti = cleanText.trim();

  // Baştaki boşlukları ve boş satırları temizle
  const lines = ayrinti.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length === 0) {
    return { baslik: "", maddeler: [], numaraliMaddeler: [], tur, ayrinti, soru, secenekler };
  }

  const baslik = lines[0];

  // Maddeler: En fazla 3 kısa madde (her biri ≤ 60 karakter, fazlası "…")
  const maddeler: string[] = [];
  const numaraliMaddeler: MesajBicimi["numaraliMaddeler"] = [];
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    if (/^\d+\s*=/.test(line)) continue;
    // Madde işaretlerini temizle (1., 2., *, - vb.)
    const isaret = /^(\d+\.?|-|\*)\s+/.exec(line);
    const no = isaret ? isaret[1].replace(/\.$/, '') : '';
    line = line.replace(/^(\d+\.?|-|\*)\s+/, '').trim();
    if (line.length === 0) continue;
    numaraliMaddeler.push({ no, yazi: line.length > 72 ? line.substring(0, 72) + '…' : line });

    if (line.length > 60) {
      line = line.substring(0, 59) + '…';
    }
    maddeler.push(line);
    if (maddeler.length === 3) break;
  }
  return { baslik, maddeler, numaraliMaddeler, tur, ayrinti, soru, secenekler };
}
