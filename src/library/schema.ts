/** Library v1 authoring contract. Production integration awaits lead approval. */
export type ReadingLayer = 'tell' | 'more' | 'deep';
export interface Rights {
  license: string; creator: string; sourceUrl: string; credit: string; changes: string;
  licenseFile?: string;
}
export interface Sentence {
  id: string; text: string; speechKey: string;
  audio: { status: 'pending'; reason: string } | {
    status: 'ready'; path: string; sha256: string; rights: Rights;
    reviewer: string; date: string; transcriptSha256: string;
  };
}
export interface LibraryImage { path: string; alt: string; rights: Rights; sha256?: string }
export interface LibraryLink {
  kind: 'item' | 'legacy-topic' | 'game' | 'make'; target: string; label: string;
}
interface BaseItem {
  schemaVersion: 1; revision: number; id: string; title: string; category: string;
  aliases: string[]; tags: string[]; image: LibraryImage; label: Sentence; rights: Rights;
  stage: { ageHint: [number, number]; support: string };
  sensitiveNotes: string[];
  review: { status: 'draft' | 'in-review' | 'approved'; reviewer: string; date: string; scope: string;
    factualReviewer?: string; familyReviewer?: string };
  sources: { title: string; url: string; accessed: string; revision?: string }[];
}
export type LibraryItem = BaseItem & (
  | { type: 'topic'; layers: Record<ReadingLayer, Sentence[]>; links: LibraryLink[] }
  | { type: 'exhibit'; model: { engine: string; limits: string }; links: LibraryLink[] }
  | { type: 'collection'; members: string[]; links: LibraryLink[] }
  | { type: 'book'; edition: { language: string; isbn: string; originalTitle: string; rights: Rights };
      pages: { image: LibraryImage; sentences: Sentence[] }[]; links: LibraryLink[] }
);
