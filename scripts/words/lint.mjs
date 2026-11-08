import { TIERS, englishKey } from './core.mjs';

/** Every finding is a review flag, never an automatic faith-word rejection. */
export function lintClue(clue, vocabulary) {
  const flags = [], add = (rule, detail) => flags.push({ rule, detail, action: 'review' });
  const words = clue.text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
  const max = [12, 16, 24, 32][TIERS.indexOf(clue.tier)] ?? 12;
  const answer = englishKey(clue.answer).replaceAll(' ', '');
  if (words.some(w => englishKey(w) === answer) || (clue.answer.includes(' ') && clue.text.toUpperCase().includes(clue.answer))) add('answer-in-clue', clue.answer);
  if (words.length > max || clue.text.length > 180) add('length', `${words.length} words`);
  const band=TIERS.indexOf(clue.tier)+1;
  const vocab = new Set(vocabulary.filter(v => typeof v === 'string' || (Number.isInteger(v.readBand) && v.readBand <= band)).map(v => englishKey(typeof v === 'string' ? v : v.spelling)));
  const unknown = [...new Set(words.map(englishKey).filter(w => !vocab.has(w)))];
  if (unknown.length) add('vocabulary', unknown.join(', '));
  const rules = [
    ['one-home', /\b(mom and dad|mum and dad|both parents|your parents|wicked stepmother|your only home)\b/i],
    ['colonial-framing', /\b(discovered|primitive|savage|natives|exotic)\b/i],
    ['pressure', /\b(hurry|quickly|beat the clock|time is running out|too slow|stupid|easy for everyone)\b/i],
    ['brand', /\b(spam|disney|lego|coca.cola|mcdonald'?s|youtube|tiktok|pokemon)\b/i],
    ['faith-respect', /\b(silly beliefs|fake god|religion is a myth|pray to another god)\b/i],
    ['body-shaming', /\b(fat people|ugly child|ugly person)\b/i],
    ['local-sensitivity', /\b(taotaomo.na|nuclear|occupation|world war|bikini)\b/i],
  ];
  for (const [rule, pattern] of rules) if (pattern.test(clue.text)) add(rule, 'Check tone and context');
  if (TIERS.indexOf(clue.tier) === 0 && /\b(gun|weapon|kill|death|dead)\b/i.test(clue.text)) add('little-hard-word', 'No weapons/killing in Little clues');
  if (/\bchamorro\b/i.test(clue.text)) add('chamoru-name', 'Use CHamoru');
  return flags;
}
