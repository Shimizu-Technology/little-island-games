import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { savedScrollPosition } from "../src/library/scrollPosition";
import { collectionEmptyMessage } from "../src/library/availability";
import { newLibraryChild, validLibraryChild } from "../src/library/state";
import items from "../content/library/items.json";
const read=(path:string)=>readFileSync(path,"utf8");
const hash=(text:string)=>createHash("sha256").update(text).digest("hex");
it("Q4 clamps native bounce, lower-edge overscroll, short content, nonfinite offsets and the save bound",()=>{
  const scroll=(y:number,height=2000,view=700)=>savedScrollPosition({contentOffset:{x:0,y},contentSize:{width:390,height},layoutMeasurement:{width:390,height:view}});
  expect(scroll(-240)).toBe(0);expect(scroll(0)).toBe(0);expect(scroll(100)).toBe(100);
  expect(scroll(1500)).toBe(1300);expect(scroll(50,300)).toBe(0);
  expect(scroll(NaN)).toBe(0);expect(scroll(Infinity)).toBe(0);expect(scroll(2e6,3e6)).toBe(1e6);
  const child=newLibraryChild();child.positions={"topic:latte-stones":scroll(-240)};
  expect(validLibraryChild(child)).toBe(true);
});
it("Q7 identifies the grown-up choice for Books and other hidden collections, while preserving the absent-content message",()=>{
  expect(collectionEmptyMessage("books",[])).toBe("A grown-up has put the picture books away for now.");
  for(const category of ["faith","island-history","animals"])
    expect(collectionEmptyMessage(category,[])).toContain("A grown-up has put this collection away");
  expect(collectionEmptyMessage("books",["books"])).toContain("when they are installed");
});
describe("Q8 chrome scaling contract; reading remains uncapped",()=>{
  it.each([
    ["src/hub/IslandScene.tsx", "{name}"], ["src/hub/HubScreen.tsx", "little island"], ["src/hub/HubScreen.tsx", "{label}"],
    ["src/library/LibraryScreen.tsx", '{place === "reader" ? record?.title'],
    ["src/library/LibraryScreen.tsx", '{tab === "shelf" ? "My Shelf"'],
    ["src/library/Reader.tsx", "Page {index + 1}"], ["src/home/runtime/HomeChrome.tsx", '{title ??'],
  ])("%s keeps %s in capped, unbroken chrome",(path,label)=>{
    const text=read(path);
    const tag=[...text.matchAll(/<Text\b([^>]+)>([\s\S]*?)<\/Text>/g)].find(match=>match[2].includes(label))?.[0].split('>')[0] ?? '';
    expect(tag).toMatch(/maxFontSizeMultiplier=\{1\.[23]\}/);expect(tag).toContain('numberOfLines={1}');
  });
  it("body and sentence text have no scaling ceiling",()=>{
    for(const path of ["src/library/Reader.tsx","src/library/Topics.tsx"]){
      const text=read(path);
      for(const tag of text.matchAll(/<Text\b[^>]*>/g))if(tag[0].includes('s.body'))expect(tag[0]).not.toContain('maxFontSizeMultiplier');
    }
  });
});
it.each(["habitats","migration"])("Art %s matches its accessible description and exact file hash without changing approved reading text",id=>{
  const item=items.find(i=>i.id===id)!;const art=read(item.image.path);
  expect(art).toContain(`>${item.image.alt}</title>`);expect(hash(art)).toBe(item.image.sha256);
  expect(art).toContain('<rect width="320" height="196" rx="22" fill="#E7F1DD"/>');
  expect(item.image.alt).toContain(id==='habitats'?'three eggs':'monarch butterflies');
  const expected:Record<string,string>={"habitats": "1fc592ee2fe9b17a0ab255f0b2d885ff4bc131d7b54e4358e4383c0f69175a02", "migration": "23baac1b14b4d2c309c2aa1a49c071fe3271179c877c33ca58f4450bd8dfe3de"};
  expect(hash(JSON.stringify(item.layers))).toBe(expected[id]);
});
