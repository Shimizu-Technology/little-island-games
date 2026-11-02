import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TOPICS } from '../src/explore/content';
import type { LibraryItem, Sentence } from '../src/library/schema';
const data = JSON.parse(readFileSync('content/library/items.json', 'utf8')) as LibraryItem[];
const legacy = JSON.parse(readFileSync('content/library/legacy-provenance.json', 'utf8'));
const newcomers = JSON.parse(readFileSync('content/library/new-items.json', 'utf8')) as LibraryItem[];
const plan = JSON.parse(readFileSync('content/library/collection-plan.json', 'utf8'));
const speech = JSON.parse(readFileSync('scripts/learn/library.json', 'utf8'));
const exhibits = JSON.parse(readFileSync('content/library/exhibits.json', 'utf8'));
const allTitles = new Set(plan.collections.flatMap((c: { titles: string[] }) => c.titles));
const digest = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

describe('3.1 author corpus acceptance', () => {
  it('has 90 unique wonders, 40 planned additions, three exhibits and eight complete book editions', () => {
    expect(data.filter(i => i.type === 'topic')).toHaveLength(90);
    expect(new Set(data.map(i => i.id)).size).toBe(data.length);
    expect(newcomers).toHaveLength(40);
    expect(newcomers.every(i => allTitles.has(i.title))).toBe(true);
    for (const category of ['ocean', 'guam', 'space', 'body', 'machines']) expect(newcomers.filter(i => i.category === category)).toHaveLength(8);
    expect(data.filter(i => i.type === 'exhibit')).toHaveLength(3);
    expect(data.filter(i => i.type === 'book')).toHaveLength(8);
  });
  it('retains all original facts, source/review payloads and explicit stable migration targets', () => {
    expect(Object.keys(legacy)).toHaveLength(50);
    for (const original of TOPICS) {
      const envelope = legacy[original.id];
      expect(envelope.original).toEqual(original);
      const item = data.find(i => i.id === envelope.libraryId);
      expect(item?.type).toBe('topic');
      if (item?.type !== 'topic') throw new Error(original.id);
      expect(item.layers.more.map(s => s.text).join(' ')).toContain(original.short);
      expect(item.layers.deep.map(s => s.text).join(' ')).toContain(original.deeper);
      for (const source of original.sources) expect(item.sources.some(s => s.url === source.url)).toBe(true);
    }
  });
  it('keeps short question entry, three depth choices and author-only draft status', () => {
    for (const item of data) {
      expect(item.review.status).toBe('draft');
      expect(item.review.factualReviewer).toBeUndefined();
      expect(item.review.familyReviewer).toBeUndefined();
      if (item.type !== 'topic') continue;
      expect(item.label.text).toBe(item.title);
      expect(item.layers.tell.length).toBeLessThanOrEqual(3);
      expect(Object.keys(item.layers).sort()).toEqual(['deep', 'more', 'tell']);
      for (const sentences of Object.values(item.layers)) for (const s of sentences) expect(speech[s.speechKey]).toBe(s.text);
      expect(item.links.some(l => l.kind === 'make')).toBe(true);
      if (newcomers.some(n => n.id === item.id)) expect(item.links.some(l => l.kind === 'game')).toBe(true);
    }
  });
  it('registers the separate exhibit copy and preserves the actual water-lab transition meaning', () => {
    const walk = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if ('speechKey' in value && 'text' in value) {
        const s = value as Sentence;
        expect(speech[s.speechKey]).toBe(s.text);
        expect(s.audio.status).toBe('pending');
      }
      for (const child of Object.values(value)) walk(child);
    };
    walk(exhibits);
    expect(Object.keys(exhibits).sort()).toEqual(['night-sky', 'reef-food-web', 'water-journey']);
    const warm = exhibits['water-journey'].steps.find((s: { key: string }) => s.key === 'warm');
    expect(warm.narration.map((s: Sentence) => s.text).join(' ')).toContain('evaporate back into invisible water vapor');
  });
  it('retains verified local image bytes and explicit page transcripts for all eight books', () => {
    for (const item of data) {
      if (item.type !== 'book') continue;
      expect(item.edition.rights.license).toBe('CC-BY-4.0');
      expect(item.pages.length).toBeGreaterThanOrEqual(13);
      for (const page of item.pages) {
        expect(digest(page.image.path)).toBe(page.image.sha256);
        expect(Array.isArray(page.sentences)).toBe(true);
        for (const s of page.sentences) expect(speech[s.speechKey]).toBe(s.text);
      }
    }
    const busy = data.find(i => i.id === 'busy-day');
    if (busy?.type !== 'book') throw new Error('Missing Busy Day edition');
    expect(busy.pages[14].sentences).toEqual([]);
  });
  it('keeps the taught CHamoru term tied to source-backed evidence and all body/culture drafts flagged', () => {
    const provenance = JSON.parse(readFileSync('content/library/new-provenance.json', 'utf8'));
    const term = provenance['family-walk'].chamoru.entry;
    expect(term.review_status).toBe('source_backed');
    expect(term.recommended_teaching_term).toBe('Familia');
    expect(term.source_citations.length).toBeGreaterThan(0);
    for (const i of newcomers.filter(i => i.category === 'body')) expect(i.sensitiveNotes.join(' ')).toContain('family');
    for (const id of ['village', 'family-walk', 'guam-rail', 'constellation']) expect(data.find(i => i.id === id)?.sensitiveNotes.join(' ')).toContain('cultural review');
  });
});
