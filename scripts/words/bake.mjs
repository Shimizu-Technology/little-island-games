import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { digest, requireThat, validateWord, validateClue, validatePack, answerAllowed, cellsFor, sha256 } from './core.mjs';
import { requireShippingReview } from './review.mjs';
import { scanGrid, scanScramble, scanBentPaths, scanLetterWheel, countOccurrences } from './scan.mjs';

const verifier = fileURLToPath(new URL('./verify.py', import.meta.url));
export function independentlyVerify(grids, terms) {
  const result = spawnSync('python3', ['-I', verifier], { input:JSON.stringify({grids,terms}), encoding:'utf8', maxBuffer:16*1024*1024, timeout:120000 });
  requireThat(!result.error && result.status === 0, `Independent grid verification failed: ${result.stdout || result.error || result.stderr}`);
  const receipt = JSON.parse(result.stdout);
  requireThat(receipt.passed === true && receipt.grids === grids.length && receipt.hits.length === 0 && receipt.implementationSha256 === sha256(readFileSync(verifier)), 'Independent verifier receipt mismatch');
  return receipt;
}
export function bakeBank({ words, clues = [], surfaces, evidence = {}, canonicalTerms = [], policy, sourceDirectory, fixture = false }) {
  requireThat(fixture === false, 'Test fixtures can never produce a shipping bank');
  const verifiedEvidence = {};
  requireThat(words.length > 0 && surfaces.length > 0 && Array.isArray(policy.scan) && policy.scan.length > 0 && policy.core?.length > 0, 'Empty bank or private policy');
  const sourceLock = JSON.parse(readFileSync(new URL('./sources.lock.json',import.meta.url),'utf8')).sources;
  const ids = new Set(words.map(w => w.id));
  requireThat(ids.size === words.length && new Set(surfaces.map(s => s.id)).size === surfaces.length && surfaces.every(s => typeof s.id === 'string' && s.id.length), 'Duplicate/empty bank IDs');
  words.forEach(w => {
    validateWord(w, canonicalTerms);
    requireThat(sourceLock.some(s => s.id === w.source.id && s.revision === w.source.revision && s.sha256 === w.source.sha256 && s.ship === true), 'Unpinned or rejected word source');
    requireThat(answerAllowed(w,policy), 'Exact/lemma-blocked answer');
    verifiedEvidence[w.id] = requireShippingReview(w,evidence[w.id]);
  });
  requireThat(new Set(clues.map(c => c.id)).size === clues.length && clues.every(c => !ids.has(c.id)), 'Duplicate/colliding clue IDs');
  for (const clue of clues) {
    validateClue(clue);
    const word = words.find(w => w.id === clue.wordId);
    requireThat(word && clue.answer === word.spelling, 'Clue answer mismatch');
    verifiedEvidence[clue.id] = requireShippingReview(clue,evidence[clue.id]);
  }
  requireThat(typeof sourceDirectory === 'string','Pinned source workspace required');
  const membership = spawnSync('python3',['-I',fileURLToPath(new URL('./membership.py',import.meta.url)),sourceDirectory],{input:JSON.stringify({words,canonicalTerms}),encoding:'utf8',timeout:120000});
  requireThat(membership.status === 0,`Source membership failed: ${membership.stdout || membership.stderr}`);
  const independent = checkSurfaces({words,surfaces,policy});
  const scanned = independent.grids;
  const vocabularySha256 = digest(words), scanListSha256 = digest([...policy.scan].sort());
  const clueReviewIds = [...new Set(clues.flatMap(c => verifiedEvidence[c.id].reviewIds))].sort();
  const receipt = { schemaVersion:1, vocabularySha256, scanListSha256, clueReviewIds, wordReviewIds:[...new Set(words.flatMap(w => verifiedEvidence[w.id].reviewIds))].sort(), counts:{ words:words.length,clues:clues.length,surfaces:surfaces.length,scanned }, rejectedCounts:policy.rejectedCounts ?? {}, primary:{ implementation:'js-trie-v1',passed:true,hits:0 }, independent };
  // Explicit runtime projection strips private policies, review state, hashes and provenance.
  const asset = { schemaVersion:1, words:words.map(w => ({ id:w.id, spelling:w.spelling, language:w.language, readerLevel:w.readerLevel, knownBand:w.knownBand,readBand:w.readBand,spellBand:w.spellBand,clueBand:w.clueBand,theme:w.theme,topic:w.topic,guamFit:w.guamFit,audio:w.audio, ...(w.language === 'ch' ? {canonicalId:w.canonicalId,fluentReaderChecked:false}: {}) })), clues:clues.map(c => ({id:c.id,wordId:c.wordId,text:c.text})), surfaces:surfaces.map(s => {const {id,kind,wordIds,cells,listed,shuffle,letters}=s; return {id,kind,wordIds,...(cells?{cells}:{}),...(listed?{listed}:{}),...(shuffle?{shuffle}:{}),...(letters?{letters}:{})};}), accept:[...new Set(words.filter(w => w.language === 'en').flatMap(w => [w.spelling,...w.british]))].sort() };
  return { asset,receipt };
}

/** Build-time surface QA can run before review; it never grants content approval. */
export function checkSurfaces({words,surfaces,policy}) {
  const ids = new Set(words.map(w => w.id));
  const grids = [];
  for (const s of surfaces) {
    requireThat(['word-search','matching','crossword','scramble','builder','wheel','ladder'].includes(s.kind), 'Unknown word surface');
    requireThat(s.wordIds?.length > 0 && new Set(s.wordIds).size === s.wordIds.length && s.wordIds.every(id => ids.has(id)), 'Surface has unreviewed word');
    const answers = words.filter(w => s.wordIds.includes(w.id));
    validatePack(answers);
    requireThat(answers.every(w => w.language !== 'ch' || ['word-search','matching'].includes(s.kind)), 'CHamoru surface is not allowed');
    if (s.kind === 'word-search') {
      requireThat(s.listed?.length === s.wordIds.length && new Set(s.listed.map(e => e.wordId)).size === s.wordIds.length && s.listed.every(e => s.wordIds.includes(e.wordId)), 'Each listed word needs one path');
      for (const entry of s.listed) {
        const w = words.find(w => w.id === entry.wordId);
        requireThat(entry.answer === w.spelling && countOccurrences(s.cells,cellsFor(w.spelling,w.language)) === 1, 'Listed word must occur exactly once');
      }
      requireThat(scanGrid(s.cells,policy.scan,s.listed).length === 0, 'Grid scan hit');
      const language = new Set(answers.map(w => w.language));
      requireThat(language.size === 1, 'Word-search grids cannot mix languages');
      if (answers[0].language === 'ch') s.cells.flat().forEach(cell => cellsFor(cell,'ch'));
      grids.push({ id:s.id, cells:s.cells, listed:s.listed });
    } else if (s.kind === 'scramble') {
      requireThat(answers.length === 1 && typeof s.shuffle === 'string' && [...s.shuffle].sort().join('') === [...answers[0].spelling].sort().join('') && scanScramble(s.shuffle,policy.scan).length === 0, 'Unsafe/invalid scramble');
      grids.push({id:s.id,cells:[[...s.shuffle]],listed:[]});
    } else if (s.kind === 'builder') {
      requireThat(answers.every(w => scanBentPaths(s.cells,[w.spelling]).includes(w.spelling)), 'Builder answer cannot be traced');
      requireThat(scanGrid(s.cells,policy.scan).length === 0 && scanBentPaths(s.cells,policy.core).length === 0, 'Unsafe builder grid');
      grids.push({id:s.id,cells:s.cells,listed:[]});
    } else if (s.kind === 'wheel') {
      requireThat(scanLetterWheel(s.letters,policy.core).length === 0, 'Unsafe builder wheel');
      requireThat(answers.every(w => scanLetterWheel(s.letters,[w.spelling]).length === 1), 'Wheel answer cannot be formed');
    } else if (s.kind === 'crossword') {
      // Every across/down run is an exact listed, reviewed answer. No diagonal filter.
      const slots = [];
      for (let dr = 0; dr <= 1; dr++) {
        const dc = 1-dr;
        for (let r = 0; r < s.cells.length; r++) for (let c = 0; c < s.cells[0].length; c++) {
          if (s.cells[r][c] === '#' || (s.cells[r-dr]?.[c-dc] && s.cells[r-dr][c-dc] !== '#')) continue;
          let text = '';
          for (let y=r,x=c; s.cells[y]?.[x] && s.cells[y][x] !== '#'; y+=dr,x+=dc) text+=s.cells[y][x];
          if (text.length > 1) slots.push(text);
        }
      }
      requireThat(slots.length > 0 && slots.every(text => answers.some(w => w.spelling.replaceAll(' ','') === text)) && answers.every(w => slots.includes(w.spelling.replaceAll(' ',''))), 'Crossword has an unreviewed run');
    } else if (s.kind === 'ladder') {
      requireThat(answers.every(w => w.spelling.length >= 3 && w.spelling.length <= 5 && w.form === 'lemma'), 'Invalid ladder list');
    }
  }
  return independentlyVerify(grids,policy.scan);
}
