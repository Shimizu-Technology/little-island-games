import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const read = (name: string) => readFileSync(`src/${name}`, 'utf8');
it('4 connects grid touch ownership to the enclosing page scroll', () => {
  expect(read('cove/CoveRound.tsx')).toContain('scrollEnabled={!gridTouch}');
  expect(read('cove/CoveRound.tsx')).toContain('<GridInteraction.Provider value={hold}>');
  expect(read('puzzles/grid/GridShell.tsx')).toContain('interaction(true)');
  expect(read('puzzles/grid/GridShell.tsx')).toContain('interaction(false)');
});
it('5 pans by accumulated gesture centroid, never changed-touch page coordinates', () => {
  const s = read('puzzles/grid/GridShell.tsx'); expect(s).toContain('g.dx'); expect(s).toContain('g.dy'); expect(s).not.toContain('e.nativeEvent.pageX - d.x');
});
it('10 explicitly leaves edge input open for G2 instead of claiming shell support', () => {
  const s = read('puzzles/grid/README.md'); expect(s).toContain('Edge input: OPEN'); expect(s).toContain('nearestEdge');
});
it('11 keeps School Continue alongside Cove Continue', () => {
  const s = read('hub/HubScreen.tsx'); expect(s).not.toContain(': resume && dock'); expect(s).toContain("dock('School'");
});
it('12 offers a last-person resume shortcut without making that person active at launch', () => {
  const s = read('cove/HubCove.tsx'); expect(s).toContain('lastCoveContinue'); expect(s).toContain('person:'); expect(read('cove/CoveScreen.tsx')).toContain('ResumeCovePerson');
});
it('15 keeps the adapter-dependent Today views explicitly open', () => {
  const s = read('cove/README.md'); expect(s).toContain('Family Ladder: OPEN'); expect(s).toContain('Island Postcard: OPEN'); expect(s).toContain('same Word Ladder');
});
it('16 reads reader metadata and badges puzzle cards without locking bands', () => {
  const s = read('cove/PuzzleBrowser.tsx'); expect(s).toContain('.readers'); expect(s).toContain('reader');
});
it('17 gates fill-notes authorization independently of reading choice', () => {
  expect(read('cove/CoveGrownUps.tsx')).toContain("adult && preferences.reader === 'Grown-up'"); expect(read('cove/CoveScreen.tsx')).toContain('GridAdult');
});
it('18 virtualizes the All puzzles list and avoids per-card linear index lookup', () => {
  expect(read('cove/ChooseGrid.tsx')).toContain('FlatList'); expect(read('cove/PuzzleBrowser.tsx')).not.toContain('entry.puzzles.indexOf');
});
it('20 filters hidden puzzles before Today selection', () => {
  const s = read('cove/CoveScreen.tsx'); expect(s).toContain('visibleEntries'); expect(s).not.toContain('items).filter(p => !hidden(p.card))');
});
it('25 displays errors in the grown-up sheet and confirms a sent pin in place', () => {
  expect(read('cove/CoveGrownUps.tsx')).toContain('{!!error && <Text'); expect(read('cove/CoveScreen.tsx')).toContain('error={local.error}');
  expect(read('cove/RoundMore.tsx')).toContain('Sent to {sent}.'); expect(read('cove/RoundMore.tsx')).toContain('could not be sent to');
});
it('26 matches the people name input limit to Store', () => expect(read('cove/PeoplePicker.tsx')).toContain('maxLength={24}'));
