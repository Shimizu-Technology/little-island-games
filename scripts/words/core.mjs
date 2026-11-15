import { createHash } from 'node:crypto';

export const TIERS = ['Little', 'Growing', 'Strong', 'Grown-up'];
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  if (value === undefined || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('Non-JSON value');
  return JSON.stringify(value);
}
export const digest = value => sha256(canonical(value));
export function requireThat(ok, message) { if (!ok) throw new Error(message); }
export const nonempty = s => typeof s === 'string' && s.trim().length > 0;
export const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(s) && Number.isFinite(Date.parse(s));
export const foldScan = s => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/['ʼ’\s-]/g, '').toUpperCase();
export const englishKey = s => s.trim().toUpperCase();
export const CHAMORU_ALPHABET = ["'", 'A', 'Å', 'B', 'CH', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'Ñ', 'NG', 'O', 'P', 'R', 'S', 'T', 'U', 'Y'];
export function cellsFor(spelling, language = 'en') {
  requireThat(nonempty(spelling), 'Missing spelling');
  const s = spelling.normalize('NFC').toUpperCase();
  if (language === 'en') {
    requireThat(/^[A-Z]+(?: [A-Z]+)*$/.test(s), 'English spelling must contain letters and spaces');
    return [...s.replaceAll(' ', '')];
  }
  requireThat(language === 'ch', 'Unknown language');
  const cells = s.match(/CH|NG|./gu) ?? [];
  requireThat(cells.every(c => CHAMORU_ALPHABET.includes(c)), 'Invalid CHamoru letter or phrase');
  return cells;
}
export function validateWord(w, canonicalTerms = []) {
  requireThat(w?.schemaVersion === 1 && nonempty(w.id) && nonempty(w.sense), 'Invalid word identity/sense');
  requireThat(w.language === 'en' || w.language === 'ch', 'Invalid word language');
  cellsFor(w.spelling, w.language);
  requireThat(nonempty(w.lemma) && TIERS.includes(w.readerLevel), 'Missing lemma/reader level');
  for (const k of ['knownBand', 'readBand', 'spellBand', 'clueBand']) requireThat(Number.isInteger(w[k]) && w[k] >= 1 && w[k] <= 4, `Invalid ${k}`);
  requireThat(nonempty(w.theme) && nonempty(w.topic) && Number.isFinite(w.guamFit) && w.guamFit >= 0 && w.guamFit <= 1, 'Missing word tags');
  requireThat(w.audio === null || nonempty(w.audio), 'Missing audio field');
  requireThat(nonempty(w.source?.id) && nonempty(w.source?.revision) && /^[a-f0-9]{64}$/.test(w.source?.sha256), 'Missing pinned source');
  requireThat(['lemma', 'plural', 'inflection'].includes(w.form) && typeof w.properNoun === 'boolean' && typeof w.abbreviation === 'boolean', 'Missing spelling metadata');
  requireThat(Array.isArray(w.british) && w.british.every(v => /^[A-Z]+$/.test(v)), 'Invalid British variants');
  const tier = TIERS.indexOf(w.readerLevel) + 1;
  requireThat(!w.abbreviation, 'Abbreviations are not launch answers');
  requireThat(!w.spelling.includes(' ') || tier === 4, 'Multi-word answers are adult only');
  if (w.spelling.includes(' ')) requireThat(Array.isArray(w.wordLengths) && canonical(w.wordLengths) === canonical(w.spelling.split(' ').map(p => p.length)), 'Missing multi-word lengths');
  requireThat(tier > 2 || w.form === 'lemma', 'Child answers must be lemmas');
  requireThat(tier > 2 || !w.properNoun || ['GUAM', 'ADVENT', 'EASTER', 'GOD', 'JESUS', 'MARY', 'JOSEPH', 'CHRISTMAS', 'PENTECOST'].includes(w.spelling), 'Child proper noun requires policy exception');
  requireThat(!['FAT','UGLY'].includes(w.spelling) || tier === 4, 'Body labels stay out of child answers');
  requireThat(w.topic !== 'other-faith' || tier >= 3, 'Other faiths require an older factual context');
  requireThat(!w.livingPerson, 'No living people');
  requireThat(!['DRAGON', 'FAIRY', 'GIANT', 'GHOST'].includes(w.spelling) || w.topic === 'stories', 'Story sense required');
  requireThat(!['WITCH', 'DEVIL', 'DEMON'].includes(w.spelling) || tier >= 3, 'Spooky word requires Strong or above');
  requireThat(!['DEAD', 'DEATH', 'GUN'].includes(w.spelling) || (tier >= 2 && ['science', 'history'].includes(w.topic)), 'Hard word requires calm science/history sense');
  requireThat(w.spelling !== 'SWORD' || w.topic === 'stories', 'Sword requires story context');
  if (w.language === 'ch') {
    const source = canonicalTerms.find(t => t.id === w.canonicalId);
    requireThat(source?.review_status === 'source_backed' && source.recommended_teaching_term === w.spelling, 'CHamoru must match source-backed teaching spelling exactly');
    requireThat(w.uses?.length > 0 && w.uses.every(u => ['word-search', 'matching'].includes(u)), 'CHamoru is limited to word search/matching');
    requireThat(w.fluentReaderChecked === false, 'Record CHamoru as not checked by a fluent reader');
  } else requireThat(w.spelling === englishKey(w.spelling) && w.locale === 'en-US', 'Answers use American uppercase spelling');
  return w;
}
export function validateClue(c) {
  requireThat(c?.schemaVersion === 1 && nonempty(c.id) && nonempty(c.wordId) && nonempty(c.answer) && nonempty(c.meaning) && nonempty(c.text) && TIERS.includes(c.tier), 'Invalid clue');
  requireThat(c.candidates?.length === 3 && new Set(c.candidates).size === 3 && c.candidates.includes(c.text) && c.candidates.every(nonempty), 'Keep three distinct draft candidates');
  requireThat(nonempty(c.provenance?.model) && isDate(c.provenance?.date) && nonempty(c.provenance?.promptVersion) && /^[a-f0-9]{64}$/.test(c.provenance?.promptSha256), 'Missing drafting provenance');
  // Clean-room drafting sees only the answer, meaning, tier and tone. A blind reviewer's revision also saw our
  // own original clue (never published clues or the web); it is labelled as such and names the clue it revises.
  const revision=c.provenance.inputs === 'answer,meaning,tier,tone,own-original-clue' && nonempty(c.provenance.revisionOf) && c.provenance.revisionOf !== c.id;
  requireThat(c.provenance.webUsed === false && (c.provenance.inputs === 'answer,meaning,tier,tone' || revision), 'Clean-room drafting required');
  return c;
}

/** Exact answer decisions are separate from the intentionally broad grid scan. */
export function answerAllowed(word, policy) {
  if (word.language === 'ch') {
    requireThat(Array.isArray(policy.chamoruSensitive) && policy.chamoruSensitive.length > 0, 'Private CHamoru sensitive-headword policy required');
    const sensitive=new Set(policy.chamoruSensitive.map(foldScan));
    if (sensitive.has(foldScan(word.spelling)) || sensitive.has(foldScan(word.lemma))) return false;
  }
  const key = englishKey(word.spelling), lemma = englishKey(word.lemma);
  const candidates=[key,...(word.british ?? []).map(englishKey)];
  return candidates.every(v=>!new Set(policy.exact.map(englishKey)).has(v) && !new Set(policy.lemmas.map(englishKey)).has(v)) && !new Set(policy.lemmas.map(englishKey)).has(lemma);
}
export function rankedWords(words) { return [...words].sort((a, b) => b.guamFit - a.guamFit || a.spelling.localeCompare(b.spelling)); }
export function validatePack(words) {
  requireThat(new Set(words.map(w => w.id)).size === words.length, 'Duplicate record');
  requireThat(new Set(words.map(w => `${w.language}:${englishKey(w.lemma)}`)).size === words.length, 'Word and inflection cannot share a pack');
  const adults = words.filter(w => w.readerLevel === 'Grown-up');
  requireThat(adults.filter(w => w.form !== 'lemma').length <= Math.floor(adults.length * 0.1), 'Adult inflection cap is 10%');
}

/**
 * Lead contract change: W1 reading records. A Sound Boat word built from pieces. Structure only, with closed keys:
 * no status, review or provenance field can ride along. The kit's morphology rules (src/learn/reading) run on the
 * app side over the same projection, so a record is checked in both places.
 */
export const READING_KINDS = ['compound', 'syllables', 'ending', 'prefix'];
export const READING_CHANGES = ['none', 'drop-e', 'double', 'y-to-i'];
const READING_KEYS = ['id', 'word', 'level', 'kind', 'chunks', 'distractors', 'base', 'affix', 'change', 'gloss', 'family', 'alternates'];
export function validateReadingRecord(r) {
  const piece = p => typeof p === 'string' && /^[a-z]{1,8}$/.test(p);
  requireThat(r && typeof r === 'object' && !Array.isArray(r) && Object.keys(r).every(k => READING_KEYS.includes(k)), 'Reading record has unexpected fields');
  requireThat(typeof r.id === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(r.id) && typeof r.word === 'string' && /^[a-z]{4,14}$/.test(r.word), 'Invalid reading id or word');
  requireThat(READING_KINDS.includes(r.kind) && (r.level === 4 || r.level === 5), 'Invalid reading kind or level');
  requireThat(Array.isArray(r.chunks) && r.chunks.length >= 2 && r.chunks.length <= 4 && r.chunks.every(piece) && r.chunks.join('') === r.word, 'Reading pieces must spell the word');
  requireThat(Array.isArray(r.distractors) && r.distractors.length >= 2 && r.distractors.length <= 4 && r.distractors.every(piece) && new Set(r.distractors).size === r.distractors.length && r.distractors.every(d => !r.chunks.includes(d)), 'Reading wrong pieces must be 2-4 distinct pieces that are not right pieces');
  for (const k of ['base', 'affix', 'family']) requireThat(r[k] === undefined || (typeof r[k] === 'string' && /^[a-z]{1,10}$/.test(r[k])), `Invalid reading ${k}`);
  requireThat(r.change === undefined || READING_CHANGES.includes(r.change), 'Invalid reading spelling change');
  requireThat(r.gloss === undefined || (typeof r.gloss === 'string' && /^[a-z ]{3,40}$/.test(r.gloss)), 'Invalid reading gloss');
  requireThat(r.alternates === undefined || (Array.isArray(r.alternates) && r.alternates.every(a => Array.isArray(a) && a.every(piece) && a.join('') === r.word)), 'Invalid reading alternates');
  return r;
}
/** Every string a child could see for this record, for the private scan. */
export function readingStrings(r) {
  return [r.word, ...r.chunks, ...r.distractors, ...(r.base ? [r.base] : []), ...(r.affix ? [r.affix] : []), ...(r.family ? [r.family] : []), ...(r.alternates ?? []).flat(), ...(r.gloss ? r.gloss.split(' ') : [])];
}
