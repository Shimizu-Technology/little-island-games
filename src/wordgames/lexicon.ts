import { discoveryTracks } from '../learn/growth/discovery';
import { numberTracks } from '../learn/growth/numbers';
import { tasks as scienceTasks, type Game as ScienceGame } from '../learn/games/weather-watch/model';
import { FLOAT_EXPERIMENTS } from '../learn/games/float-sink/stages';
import { legacyWordRescue } from '../../content/words/registry';
import { catalog } from '../library/catalog';

export interface TrieNode { children: Map<string, TrieNode>; word?: string }
export function buildTrie(words: ReadonlySet<string>): TrieNode {
  const root: TrieNode = { children: new Map() };
  for (const word of words) {
    let node = root;
    for (const letter of word) {
      let child = node.children.get(letter);
      if (!child) { child = { children: new Map() }; node.children.set(letter, child); }
      node = child;
    }
    node.word = word;
  }
  return root;
}
let lexicon: ReadonlySet<string> | undefined;
let trie: TrieNode | undefined;
/** Existing human-facing Library, Word Rescue, science and maths prose only.
 * Reading snapshots belong exclusively to their branded provenance boundary. Never read distractors, code or metadata. */
export function getWordLexicon(): ReadonlySet<string> {
  if (lexicon) return lexicon;
  const words = new Set<string>();
  const prose = (value: string) => {
    // Whole alphabetic tokens only: do not turn URLs, underscores, digits or contractions into answers.
    for (const token of value.replace(/https?:\/\/\S+/gi, '').split(/\s+|[.,!?;:()“”"/—–]+/u)) {
      const word = token.toUpperCase();
      if (/^[A-Z]{3,8}$/.test(word)) words.add(word);
    }
  };
  for (const tracks of [discoveryTracks, numberTracks])
    for (const stages of Object.values(tracks)) for (const stage of Object.values(stages)) {
      prose(stage.label); prose(stage.description);
      for (const question of stage.questions) {
        prose(question.prompt); if (question.context) prose(question.context); prose(question.explanation);
      }
    }
  const science = (game: ScienceGame) => {
    // Three authored variants cover the existing task text; no generated IDs, labels or answer choices are read.
    for (let level = 1; level <= 5; level++) for (let seed = 0; seed < 3; seed++)
      for (const task of scienceTasks(game, level, seed)) {
        // Gauge titles are abbreviated weekday chart labels, not prose.
        if (task.kind !== 'gauge') prose(task.title);
        prose(task.goal); prose(task.fact); prose(task.notice);
      }
  };
  science('weather-watch'); science('food-web'); science('space-station');
  for (const experiment of FLOAT_EXPERIMENTS) {
    prose(experiment.title); prose(experiment.question); prose(experiment.hint); prose(experiment.why);
  }
  legacyWordRescue.forEach(item => { prose(item[0]); prose(item[2]); });
  for (const entry of catalog) {
    prose(entry.title);
    if (entry.legacy) {
      prose(entry.legacy.short); prose(entry.legacy.deeper); prose(entry.legacy.question);
    }
    const item = entry.item;
    if (!item) continue;
    prose(item.label.text);
    if (item.type === 'topic') Object.values(item.layers).forEach(layer => layer.forEach(sentence => prose(sentence.text)));
    if (item.type === 'prayer') item.sentences.forEach(sentence => prose(sentence.text));
    if (item.type === 'book') item.pages.forEach(page => page.sentences.forEach(sentence => prose(sentence.text)));
  }
  lexicon = words;
  return lexicon;
}
export function getWordTrie() { return trie ??= buildTrie(getWordLexicon()); }
export function isValidPrefix(prefix: string) {
  let node = getWordTrie();
  for (const letter of prefix.toUpperCase()) { const next = node.children.get(letter); if (!next) return false; node = next; }
  return true;
}
