import { describe, expect, it } from "vitest";
import { appRows, enOnemli } from "../src/core/apps";
describe("Afu Merkez", () => {
  it("kurulu olmayan soluk, Android telefonda etiketi", () => {
    const rows = appRows([{id:"afudm",ad:"AfuDM",yol:"a.exe"},{id:"afutube",ad:"AfuTube",yol:null},{id:"remote",ad:"AfuRemote",yol:null,tur:"android"}], {afudm:{durum:"calisiyor",ozet:"3 indirme"}});
    expect(rows.map(r=>r.etiket)).toEqual(["Aç","Kurulu değil","Telefonda"]);
    expect(rows[0]).toMatchObject({ozet:"3 indirme",nokta:"mavi"});
    expect(rows.slice(1).every(r=>!r.acilabilir)).toBe(true);
  });
  it("birleşik durum en önemliyi seçer", () => {
    expect(enOnemli(["calisiyor","hata","uyari"])).toBe("hata");
    expect(enOnemli(["bos","calisiyor","uyari"])).toBe("uyari");
    expect(enOnemli([])).toBe("bos");
  });
  it("yeni snapshot eski durumu saklamaz", () => {
    const apps = [{id:"a",ad:"Afu",kurulu:true},{id:"b",ad:"B",kurulu:false}];
    expect(appRows(apps,{a:{durum:"hata",ozet:"Yeniden dene"}})[0].nokta).toBe("kirmizi");
    expect(appRows(apps,{})[0]).toMatchObject({nokta:null,ozet:""});
    expect(appRows(apps,{b:{durum:"hata",ozet:"Eski bilgi"}})[1].ozet).toBe("");
  });
  it("backend kurulum bilgisi yol tahmininden önce gelir", () => {
    expect(appRows([{id:"a",ad:"A",kurulu:false,yol:"a.exe"},{id:"b",ad:"B",telefonda:true,kurulu:true}],{}).map(r=>r.etiket)).toEqual(["Kurulu değil","Telefonda"]);
  });
  it("indirUrl varsa İndir görünür, kuruluysa Aç görünür", () => {
    const rows = appRows([
      {id:"afudm", ad:"AfuDM", kurulu:false, indirUrl:"https://github.com/pirncedark/"},
      {id:"afutube", ad:"AfuTube", kurulu:true, indirUrl:"https://github.com/pirncedark/a"},
      {id:"remote", ad:"AfuRemote", telefonda:true, indirUrl:"https://github.com/pirncedark/apk"}
    ], {});
    expect(rows.map(r=>r.etiket)).toEqual(["İndir", "Aç", "APK indir"]);
    expect(rows.map(r=>r.indirilebilir)).toEqual([true, false, true]);
  });
});
import { afterEach, vi } from "vitest";
import { AfuViews } from "../src/views/views";
import { AfuPet } from "../src/afu/pet";

class ElementStub {
  children: ElementStub[] = [];
  textContent = "";
  className = "";
  hidden = false;
  disabled = false;
  dataset = {};
  style = { setProperty: vi.fn() };
  listeners = new Map<string, ((event: unknown) => void)[]>();
  setAttribute = vi.fn();
  append(...children: ElementStub[]) { this.children.push(...children); }
  replaceChildren(...children: ElementStub[]) { this.children = children; }
  addEventListener(name: string, handler: (event: unknown) => void) { this.listeners.set(name, [...this.listeners.get(name) ?? [], handler]); }
  getAnimations() { return []; }
  getBoundingClientRect() { return {left: 20, bottom: 80}; }
  querySelector() { return undefined; }
  contains(element: ElementStub) { return element === this || this.children.some(child => child.contains(element)); }
  fire(name: string, event = {}) { for (const handler of this.listeners.get(name) ?? []) handler(event); }
}
function fakeDom() {
  const body = new ElementStub();
  vi.stubGlobal("document", { body, createElement: () => new ElementStub(), createTextNode: (text: string) => Object.assign(new ElementStub(), {textContent:text}), addEventListener: vi.fn() });
  vi.stubGlobal("matchMedia", () => ({matches:true,addEventListener:vi.fn()}));
  vi.stubGlobal("Image", class {src="";});
  vi.stubGlobal("innerWidth", 720); vi.stubGlobal("innerHeight", 320);
}
afterEach(() => vi.unstubAllGlobals());

it("görünüm metni DOM olarak yorumlamaz ve kaybolan durum temizlenir", () => {
  fakeDom();
  const views = new AfuViews({ collapse() {}, quota() {}, appOpen: vi.fn(async () => undefined) });
  const snapshot = {apps:[{id:"a",ad:'<img onerror="bad">',kurulu:true},{id:"b",ad:"B",kurulu:false}],durumlar:{a:{durum:"calisiyor" as const,ozet:"3 indirme"}}};
  views.setApps(snapshot);
  const rows = (views.apps as unknown as ElementStub).children;
  expect(rows[1].children[1].children[0].textContent).toBe('<img onerror="bad">');
  expect(rows[2].children[2].disabled).toBe(true);
  views.setApps({...snapshot,durumlar:{}});
  expect((views.apps as unknown as ElementStub).children[1].children[1].children[1].textContent).toBe("");
});
it("pet sağ tık listeyi açar, sol tık kartı açmaya devam eder", () => {
  fakeDom();
  const card = vi.fn(), refresh = vi.fn(), open = vi.fn(async () => undefined);
  const pet = new AfuPet(card, refresh);
  pet.setAppOpener(open);
  pet.setApps({apps:[{id:"a",ad:"AfuDM",kurulu:true},{id:"b",ad:"AfuTube",kurulu:false}],durumlar:{}});
  const el = pet.el as unknown as ElementStub;
  const preventDefault = vi.fn();
  el.fire("contextmenu", {preventDefault});
  expect(preventDefault).toHaveBeenCalledOnce(); expect(refresh).toHaveBeenCalledOnce();
  expect(pet.appsMenu.hidden).toBe(false); expect(card).not.toHaveBeenCalled();
  const rows = (pet.appsMenu as unknown as ElementStub).children;
  expect(rows[1].disabled).toBe(false); expect(rows[2].disabled).toBe(true);
  el.fire("click"); expect(card).toHaveBeenCalledOnce(); expect(open).not.toHaveBeenCalled();
});
it("pet menü penceresi her kapanış yolunda kapatma bildirir",()=>{fakeDom();const visible=vi.fn();const pet=new AfuPet(vi.fn(),undefined,visible);const el=pet.el as unknown as ElementStub;el.fire("contextmenu",{preventDefault:vi.fn()});expect(visible).toHaveBeenLastCalledWith(true);el.fire("click");expect(visible).toHaveBeenLastCalledWith(false);el.fire("contextmenu",{preventDefault:vi.fn()});pet.setVisible(false);expect(visible).toHaveBeenLastCalledWith(false);});
it("pet menüsü büyüyen pencerede petin üstüne yerleşir",()=>{fakeDom();vi.stubGlobal("innerHeight",500);const pet=new AfuPet(vi.fn());const menu=pet.appsMenu as unknown as ElementStub & {offsetHeight:number;style:{top:string;setProperty:typeof vi.fn}};menu.offsetHeight=150;(pet.el as unknown as ElementStub).getBoundingClientRect=()=>({left:20,bottom:500,top:372} as any);(pet.el as unknown as ElementStub).fire("contextmenu",{preventDefault:vi.fn()});expect(Number.parseFloat(menu.style.top)+150).toBeLessThanOrEqual(364);});
