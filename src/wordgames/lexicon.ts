import { WORDS } from '../learn/content/reading/words';
import { LADDERS } from '../learn/content/reading/ladders';
import { PICTURE_WORDS, LEGACY_WARMUP_WORDS } from '../learn/content/reading/clues';
import { LETTER_LAGOON_BANK } from '../learn/content/reading/lagoon';
import { WORD_WORKSHOP_BANK } from '../learn/content/reading/workshop';
import { STORY_STUDIO_BANK } from '../learn/content/reading/studio';
import { SENTENCES } from '../learn/content/reading/sentences';
import { STORIES } from '../learn/content/reading/stories';
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
/** Only admitted reading answers and human-facing prose. Never traverse metadata, IDs or speech keys. */
export function getWordLexicon(): ReadonlySet<string> {
  if (lexicon) return lexicon;
  const words = new Set<string>();
  const prose = (value: string) => {
    // Whole alphabetic tokens only: do not turn URLs, underscores, digits or contractions into answers.
    for (const token of value.split(/\s+|[.,!?;:()“”"/—–]+/u)) {
      const word = token.toUpperCase();
      if (/^[A-Z]{3,8}$/.test(word)) words.add(word);
    }
  };
  WORDS.forEach(item => prose(item.word));
  LADDERS.forEach(item => item.words.forEach(prose));
  Object.values(PICTURE_WORDS).forEach(group => group.forEach(prose));
  LEGACY_WARMUP_WORDS.forEach(prose);
  // Prompt/clue are complete prose, unlike phonics fragments in answer/extras.
  for (const bank of [LETTER_LAGOON_BANK, WORD_WORKSHOP_BANK, STORY_STUDIO_BANK])
    bank.forEach(level => level.forEach(task => { prose(task.prompt); if (task.clue) prose(task.clue); if (task.completedWord) prose(task.completedWord); if (!task.completedWord) { task.answer.forEach(prose); task.extras.forEach(prose); } }));
  SENTENCES.forEach(item => prose(item.text));
  STORIES.forEach(item => { prose(item.title); item.pages.forEach(page => prose(page.text)); });
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
