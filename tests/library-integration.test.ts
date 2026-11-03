import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { exhibitWorld } from "../src/library/navigation";
import type { CatalogItem } from "../src/library/catalog";
const run = (code: string) => execFileSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8", stdio: "pipe" });
describe("Explicit family-preview admission", () => {
  it("admits reviewed records only when selected; preserves review data and default exclusion", () => {
    const result = JSON.parse(run(`import {admittedItems} from './scripts/library/admission.mjs';
      import {readFileSync} from 'node:fs';
      const items=JSON.parse(readFileSync('content/library/items.json'));
      for(const item of items){item.review.status=item.type==='collection'?'draft':'in-review';delete item.review.familyReviewer;delete item.review.familyDecision;}
      const before=JSON.stringify(items);
      const preview=admittedItems(items,{preview:true});
      console.log(JSON.stringify({defaultIds:admittedItems(items).map(i=>i.id), counts: ['topic','book','exhibit','collection','prayer'].map(type=>preview.filter(i=>i.type===type).length), unchanged:before===JSON.stringify(items), fake:preview.some(i=>i.review.familyReviewer)}));`));
    expect(result).toEqual({ defaultIds: [], counts: [118, 9, 3, 11, 5], unchanged: true, fake: false });
  });
  it("rejects every unsupported link kind/target and unsupported exhibit engine", () => {
    const result = JSON.parse(run(`import {destinationErrors} from './scripts/library/destinations.mjs';import {readFileSync} from 'node:fs';
      const items=JSON.parse(readFileSync('content/library/items.json')); const valid=destinationErrors(items);
      const bad=structuredClone(items);bad[0].links=[...['item','legacy-topic','game','make'].map(kind=>({kind,target:'missing',label:'Try'}))];
      bad.find(i=>i.type==='exhibit').model.engine='breath-preview'; console.log(JSON.stringify({valid,invalid:destinationErrors(bad)}));`));
    expect(result.valid).toEqual([]);
    expect(result.invalid).toHaveLength(5);
  });
  it("resolves the reviewed reef engine rather than returning an unavailable page", () => {
    expect(exhibitWorld({ item: { type: "exhibit", model: { engine: "food-web" } } } as CatalogItem)).toBe("oceans");
  });
  it("writes unanswered templates and refuses incomplete or stale approval without touching canonical records", () => {
    const before = readFileSync("content/library/items.json", "utf8");
    const temp = mkdtempSync(join(tmpdir(), "library-decisions-")), file = join(temp, "decisions.json");
    try {
      execFileSync(process.execPath, ["scripts/library/record-decisions.mjs", "--template", file], { stdio: "pipe" });
      const template = JSON.parse(readFileSync(file, "utf8"));
      expect(template.decisions).toHaveLength(146);
      expect(template.decisions.every((d: { decision: string; audioAccepted: boolean }) => d.decision === "pending" && !d.audioAccepted)).toBe(true);
      template.reviewer = "test-only reviewer"; template.date = "2026-11-02";
      writeFileSync(file, JSON.stringify(template));
      expect(() => execFileSync(process.execPath, ["scripts/library/record-decisions.mjs", "--file", file, "--approve"], { stdio: "pipe" })).toThrow();
      template.decisions[0].decision = "Yes"; template.decisions[0].contentSha256 = "0".repeat(64);
      writeFileSync(file, JSON.stringify(template));
      expect(() => execFileSync(process.execPath, ["scripts/library/record-decisions.mjs", "--file", file, "--dry-run"], { stdio: "pipe" })).toThrow();
      expect(readFileSync("content/library/items.json", "utf8")).toBe(before);
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });
  it("promotes only an explicitly answered isolated fixture and validates ready audio atomically", () => {
    const canonical = readFileSync("content/library/items.json", "utf8");
    const temp = mkdtempSync(join(tmpdir(), "library-promotion-"));
    try {
      for (const dir of ["content/library", "scripts/library", "scripts/learn", "assets/audio"]) mkdirSync(join(temp, dir), { recursive: true });
      const original = JSON.parse(canonical)[0];
      original.review.status = "in-review"; delete original.review.familyReviewer; delete original.review.familyDecision;
      const line = { ...original.label, text: "we", speechKey: "library-word-we", audio: { status: "pending", reason: "Isolated fixture awaiting the supplied decision." } };
      const fixture = { ...original, links: [{ kind: "make", target: "wonder-page", label: "Make a page" }], label: line, layers: { tell: [line], more: [line], deep: [line] } };
      mkdirSync(join(temp, fixture.image.path, ".."), { recursive: true });
      copyFileSync(fixture.image.path, join(temp, fixture.image.path));
      for (const file of ["content/library/categories.json", "scripts/learn/library.json", "scripts/library/validate.mjs", "scripts/library/shipping-report.mjs", "scripts/library/approval.mjs", "assets/audio/library-word-we.m4a"]) copyFileSync(file, join(temp, file));
      const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
      writeFileSync(join(temp, "content/library/items.json"), JSON.stringify([fixture]));
      writeFileSync(join(temp, "scripts/library/audio-receipt.json"), JSON.stringify({ voice: "af_heart", engine: "Kokoro-82M v1.0", networkPlayback: false, clips: { "library-word-we": { path: "assets/audio/library-word-we.m4a", sha256: hash(readFileSync("assets/audio/library-word-we.m4a")), transcriptSha256: hash("we") } } }));
      const tool = resolve("scripts/library/record-decisions.mjs"), decisionFile = join(temp, "answers.json");
      execFileSync(process.execPath, [tool, "--template", decisionFile], { cwd: temp, stdio: "pipe" });
      const answers = JSON.parse(readFileSync(decisionFile, "utf8"));
      answers.reviewer = "isolated fixture reviewer"; answers.date = "2026-11-02"; answers.scope = "reconciled recommendations";
      Object.assign(answers.decisions[0], { decision: "Yes", audioAccepted: true, pronunciationAccepted: true });
      writeFileSync(decisionFile, JSON.stringify(answers));
      execFileSync(process.execPath, [tool, "--file", decisionFile], { cwd: temp, stdio: "pipe" });
      expect(JSON.parse(readFileSync(join(temp, "content/library/items.json"), "utf8"))[0].review.status).toBe("in-review");
      execFileSync(process.execPath, [tool, "--file", decisionFile, "--approve"], { cwd: temp, stdio: "pipe" });
      const promoted = JSON.parse(readFileSync(join(temp, "content/library/items.json"), "utf8"))[0];
      expect(promoted.review.status).toBe("approved");
      expect(promoted.review.familyReviewer).toBe("isolated fixture reviewer");
      expect(promoted.layers.deep[0].audio.status).toBe("ready");
      expect(promoted.review.familyDecision.scope).toBe("reconciled recommendations");
      const finalContent = structuredClone(promoted); delete finalContent.review.familyReviewer; delete finalContent.review.familyDecision;
      expect(promoted.review.familyDecision.contentSha256).toBe(hash(JSON.stringify(finalContent)));
      expect(readFileSync("content/library/items.json", "utf8")).toBe(canonical);
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

});
