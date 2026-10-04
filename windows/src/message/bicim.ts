export interface SoruSecenegi {
  id: string;
  etiket: string;
}
export interface MesajBicimi {
  baslik: string;
  maddeler: string[];
  ayrinti: string;
  soru: boolean;
  secenekler?: SoruSecenegi[];
}

export function bicimle(text: string | undefined): MesajBicimi {
  if (!text) {
    return { baslik: "", maddeler: [], ayrinti: "", soru: false };
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
    return { baslik: "", maddeler: [], ayrinti, soru, secenekler };
  }

  // Başlık: İlk satır. Baştaki emoji başlık süsünü at.
  let baslik = lines[0].replace(/^[\p{Extended_Pictographic}\s]+/u, '').trim();
  if (!baslik) {
    baslik = lines[0]; // Sadece emojiden oluşuyorsa kendini koru
  }

  // Maddeler: En fazla 3 kısa madde (her biri ≤ 60 karakter, fazlası "…")
  const maddeler: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    // Madde işaretlerini temizle (1., 2., *, - vb.)
    line = line.replace(/^(\d+\.|-|\*)\s+/, '').trim();
    if (line.length === 0) continue;
    
    if (line.length > 60) {
      line = line.substring(0, 59) + '…';
    }
    maddeler.push(line);
    if (maddeler.length === 3) break;
  }
  return { baslik, maddeler, ayrinti, soru, secenekler };
}
