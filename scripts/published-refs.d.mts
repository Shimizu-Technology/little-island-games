export declare const publishedRefs: string[];
export declare function publishedHistory(cwd?: string, wanted?: readonly string[]): { refs: string[]; commits: string[] };
export declare function publishedFile(path: string, commit: string, cwd?: string): string | null;
export declare function publishedSnapshots(path: string, cwd?: string, wanted?: readonly string[]): { ref: string; commit: string; text: string | null }[];
export declare function publishedJson(path: string, cwd?: string, wanted?: readonly string[]): { ref: string; commit: string; value: unknown }[];
export declare function publishedTexts(path: string, cwd?: string, wanted?: readonly string[]): string[];
