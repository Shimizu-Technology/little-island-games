import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
const root = resolve('.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = process.argv.includes('--file') ? process.argv[process.argv.indexOf('--file') + 1] : 'content/library/items.json';
const shipping = process.argv.includes('--shipping');
const items = JSON.parse(readFileSync(file, 'utf8'));
const speech = JSON.parse(readFileSync('scripts/learn/library.json', 'utf8'));
const categories = JSON.parse(readFileSync('content/library/categories.json', 'utf8'));
const errors = [];
const ok = (condition, message) => { if (!condition) errors.push(message); };
const text = x => typeof x === 'string' && x.trim().length > 0;
const date = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;
function local(path, sha, label) {
  ok(text(path), `${label}: missing local path`);
  if (!text(path)) return;
  const target = resolve(root, path), rel = relative(root, target);
  ok(!rel.startsWith('..') && !rel.startsWith('/') && existsSync(target) && statSync(target).isFile(), `${label}: missing or unsafe file ${path}`);
  if (sha && existsSync(target) && statSync(target).isFile()) ok(hash(readFileSync(target)) === sha, `${label}: checksum mismatch`);
}
function rights(r, label) {
  for (const k of ['license','creator','sourceUrl','credit','changes']) ok(text(r?.[k]), `${label}: missing rights.${k}`);
  if (r?.license === 'CC-BY-4.0') { ok(text(r.licenseFile), `${label}: missing offline license`); if (r.licenseFile) local(r.licenseFile, null, label); }
}
function image(i, label) { ok(text(i?.alt), `${label}: missing alt`); rights(i?.rights, label); local(i?.path, i?.sha256, label); }
function sentence(s, approved, label) {
  for (const k of ['id','text','speechKey']) ok(text(s?.[k]), `${label}: missing sentence.${k}`);
  ok(speech[s?.speechKey] === s?.text && text(s?.text), `${label}: speech registration differs`);
  ok(['ready','pending'].includes(s?.audio?.status), `${label}: missing audio record`);
  if (s?.audio?.status === 'pending') ok(!approved && text(s.audio.reason), `${label}: approved content needs recorded audio`);
  if (s?.audio?.status === 'ready') {
    const a = s.audio; rights(a.rights, label); ok(text(a.reviewer) && date(a.date), `${label}: missing audio review`);
    ok(/^[a-f0-9]{64}$/.test(a.sha256 ?? ''), `${label}: missing audio hash`);
    ok(a.transcriptSha256 === hash(s.text), `${label}: stale recording transcript`); local(a.path, a.sha256, label);
  }
}
ok(Array.isArray(items) && items.length > 0, 'No items');
const ids = new Set();
for (const item of items) {
  const id = item?.id ?? '(missing id)';
  ok(/^[a-z][a-z0-9-]*$/.test(id) && !ids.has(id), `${id}: invalid or duplicate id`); ids.add(id);
  ok(item.schemaVersion === 1 && Number.isInteger(item.revision) && item.revision > 0, `${id}: invalid version`);
  ok(['topic','book','exhibit','collection'].includes(item.type), `${id}: invalid type`);
  ok(text(item.title) && categories.some(c => c.id === item.category), `${id}: missing title/category`);
  for (const key of ['aliases','tags','sensitiveNotes']) ok(Array.isArray(item[key]) && item[key].every(text), `${id}: invalid ${key}`);
  ok(Array.isArray(item.stage?.ageHint) && item.stage.ageHint.length === 2 && item.stage.ageHint.every(n => Number.isInteger(n) && n >= 0 && n <= 18) && item.stage.ageHint[0] <= item.stage.ageHint[1] && text(item.stage.support), `${id}: missing stage hint`);
  const r = item.review;
  ok(['draft','in-review','approved'].includes(r?.status) && text(r?.reviewer) && date(r?.date) && text(r?.scope), `${id}: missing review fields`);
  if (shipping) ok(r?.status === 'approved', `${id}: not approved for shipping`);
  const approved = shipping || r?.status === 'approved';
  if (approved) ok(text(r?.factualReviewer) && text(r?.familyReviewer), `${id}: needs factual and family approval`);
  rights(item.rights, id); image(item.image, id); sentence(item.label, approved, id);
  ok(Array.isArray(item.sources) && item.sources.length > 0 && item.sources.every(s => text(s.title) && /^https:\/\//.test(s.url) && date(s.accessed)), `${id}: missing sources`);
  ok(Array.isArray(item.links) && item.links.every(l => ['item','legacy-topic','game','make'].includes(l.kind) && text(l.target) && text(l.label) && !/^learn more$/i.test(l.label)), `${id}: invalid authored links`);
  if (item.type === 'topic') for (const layer of ['tell','more','deep']) {
    const sentences = item.layers?.[layer];
    ok(Array.isArray(sentences) && sentences.length > 0, `${id}: missing ${layer}`);
    const seen = new Set();
    for (const s of sentences ?? []) { ok(!seen.has(s.id), `${id}: duplicate sentence`); seen.add(s.id); sentence(s, approved, id); }
  }
  if (item.type === 'exhibit') ok(text(item.model?.engine) && text(item.model?.limits), `${id}: missing model/limits`);
  if (item.type === 'collection') ok(Array.isArray(item.members) && item.members.length > 0, `${id}: missing collection members`);
  if (item.type === 'book') {
    ok(text(item.edition?.isbn) && text(item.edition?.language) && text(item.edition?.originalTitle), `${id}: missing edition`); rights(item.edition?.rights, id);
    ok(Array.isArray(item.pages) && item.pages.length > 1, `${id}: missing book pages`);
    for (const page of item.pages ?? []) { image(page.image, id); ok(Array.isArray(page.sentences), `${id}: missing page transcript`); for (const s of page.sentences ?? []) sentence(s, approved, id); }
  }
}
for (const item of items) {
  for (const link of item.links ?? []) if (link.kind === 'item') ok(ids.has(link.target), `${item.id}: dangling link ${link.target}`);
  for (const id of item.members ?? []) ok(ids.has(id), `${item.id}: unknown collection member ${id}`);
}
for (const c of categories) ok(speech[c.speechKey] === c.title + '.', `${c.id}: category speech missing`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Library ${shipping ? 'shipping' : 'design'} validation: ${items.length} items; rights, review, speech registration, files and internal links checked. Draft recordings remain pending.`);
