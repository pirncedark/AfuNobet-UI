import { afterEach, expect, it, vi } from "vitest";
import { ChatView } from "../src/chat/chat";
class Element {
 textContent=""; value=""; hidden=false; disabled=false; children:Element[]=[];
 setAttribute(){} addEventListener(){} append(...items:Element[]){this.children.push(...items);} replaceChildren(...items:Element[]){this.children=items;}
}
afterEach(()=>vi.unstubAllGlobals());
it.each(["file:///C:/secret", "javascript:alert(1)", "afuremote://run", "cmd.exe /c calc", "https://example.com", "http://example.com", '<a href="javascript:alert(1)">aç</a>'])("ajan linki çalıştırılabilir öğeye dönüşmez: %s",text=>{
 const tags:string[]=[];
 vi.stubGlobal("document",{createElement:(tag:string)=>{tags.push(tag);return new Element();},createTextNode:(text:string)=>Object.assign(new Element(),{textContent:text})});
 const v=new ChatView({codexStatus:async()=>"hazir",codexSend:async()=>{},codexCancel:async()=>{},codexLogin:async()=>{},codexLoginCancel:async()=>{}});
 v.onEvent({method:"turn/started",params:{threadId:"a",turn:{id:"t"}}});
 v.onEvent({method:"item/agentMessage/delta",params:{threadId:"a",turnId:"t",delta:text}});
 expect(v.answer.textContent).toBe(text);expect(tags).not.toContain("a");expect(v.answer.children).toHaveLength(0);
});
