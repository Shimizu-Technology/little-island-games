export declare const publishedRefs: string[];
export declare function publishedHistory(cwd?: string, wanted?: readonly string[]): { refs: string[]; published: (commit: string) => boolean };
export declare function publishedTexts(file: string, cwd?: string, wanted?: readonly string[]): string[];
