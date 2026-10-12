import { describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';
import { bicimle } from '../src/message/bicim';
import { balonOlustur, bildirimBalonu, terminalPetMetni } from '../src/message/message';

describe('mesaj renk ve satır yapısı', () => {
  it('seçenek satırını madde yerine düğmeler olarak gösterir', () => {
    const doc = new Window().document as unknown as Document;
    const balloon = balonOlustur(doc, { surum: 1, id: 'question', ajan: 'codex', tur: 'bilgi', metin: '❓ Devam edelim mi?\n1 = Evet / 2 = Hayır', zaman: 0 }, () => {});
    expect(balloon.querySelectorAll('li')).toHaveLength(0);
    expect(balloon.querySelector('.soru-baslik')?.textContent).toBe('❓ Devam edelim mi?');
    expect([...balloon.querySelectorAll('.soru-secenekler button')].map(b => b.textContent)).toEqual(['Evet', 'Hayır']);
  });
  it('numaraları ve başlık emojisini korur', () => {
    const b = bicimle('🎯 Görev yürüyor\n`1` Görev gitti\n`2` Yoklama yok');
    expect(b.tur).toBe('bilgi');
    expect(b.baslik).toBe('🎯 Görev yürüyor');
    expect(b.numaraliMaddeler).toEqual([{ no: '1', yazi: 'Görev gitti' }, { no: '2', yazi: 'Yoklama yok' }]);
    expect(b.maddeler).toHaveLength(2);
  });
  it.each([['✅ Bitti\n...', 'basari'], ['❌ Hata...', 'hata'], ['⚠ Dikkat', 'uyari'], ['error', 'hata'], ['başarısız', 'hata'], ['geçti', 'basari']])('%s türünü tanır', (text, tur) => {
    expect(bicimle(text).tur).toBe(tur);
  });
  it('soru seçeneklerini korur ve soru önceliklidir', () => {
    const b = bicimle('❓ Hata var mı? 1 = A / 2 = B');
    expect(b.tur).toBe('soru');
    expect(b.secenekler).toEqual([{ id: '1', etiket: 'A' }, { id: '2', etiket: 'B' }]);
  });
  it('önizlemeyi keser ama tam metni korur', () => {
    const text = 'Başlık\n1. ' + 'a'.repeat(200);
    const b = bicimle(text);
    expect(b.numaraliMaddeler[0].yazi).toBe('a'.repeat(72) + '…');
    expect(terminalPetMetni(text).tam).toContain('a'.repeat(200));
    expect(terminalPetMetni(text).tam).toContain('\n');
  });
  it('iki maddeyi numara rozetleriyle güvenli DOM olarak çizer', () => {
    const window = new Window();
    const document = window.document as unknown as Document;
    const text = '✅ Bitti\n`1` <script>alert(1)</script>\n2. İkinci\n- Üçüncü';
    const balloon = balonOlustur(document, { surum: 1, id: 'test', ajan: 'codex', tur: 'bilgi', metin: text, zaman: 0 }, () => {});
    expect(balloon.classList.contains('tur-basari')).toBe(true);
    expect(balloon.querySelectorAll('li')).toHaveLength(2);
    expect(Array.from(balloon.querySelectorAll('.afu-madde-no')).map(e => e.textContent)).toEqual(['1', '2']);
    expect(balloon.querySelector('script')).toBeNull();
    expect(balloon.textContent).toContain('<script>alert(1)</script>');
    const host = document.createElement('div');
    bildirimBalonu(document, host, { type: 'notification', id: 'test', text, ajan: 'codex' } as Parameters<typeof bildirimBalonu>[2], () => {});
    expect(host.querySelector('script')).toBeNull();
    expect(host.querySelector('.afu-balon-metin')?.textContent).toContain('\n');
  });
});
