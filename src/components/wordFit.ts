/**
 * iOS breaks a word mid-way only when that word alone is wider than its line ("Challe/nge", "Lago/on").
 * A large decorative title therefore stops growing at the text size where its longest word still fits.
 * Advances are AvenirNext-Heavy per 1,000 units (CoreText, iOS 26 / macOS 26), the widest weight titles use,
 * so the estimate is never narrower than Bold or DemiBold text. Unknown characters count as the widest glyph.
 */
const ADVANCE: Record<string, number> = {
  a:591,b:694,c:526,d:694,e:630,f:424,g:697,h:666,i:339,j:346,k:670,l:342,m:976,n:666,o:664,p:694,q:694,r:445,s:513,t:421,u:663,v:638,w:973,x:675,y:638,z:557,å:591,
  A:776,B:693,C:696,D:788,E:603,F:581,G:762,H:802,I:372,J:573,K:763,L:549,M:1008,N:791,O:855,P:684,Q:864,R:714,S:617,T:600,U:775,V:739,W:1077,X:800,Y:738,Z:672,
  '0':700,'1':700,'2':700,'3':700,'4':700,'5':700,'6':700,'7':700,'8':700,'9':700,'-':336,',':360,':':380,'!':448,'?':587,'.':360,'·':360,"'":334,'’':342,'&':840,
};
const WIDEST = 1077, MARGIN = 0.92;
/** Width of a word at 1 pt, in points. Negative letter spacing (headings use -0.6) only narrows it, so it is ignored. */
export const wordWidth = (word: string) => [...word].reduce((sum,c)=>sum+(ADVANCE[c]??WIDEST)/1000,0);
/**
 * The largest `maxFontSizeMultiplier` at which every word of `text` fits on one line of `width` points.
 * Never below 1 (default text is never shrunk) and never above `ceiling`.
 */
export function wordFitMultiplier(text: string, fontSize: number, width: number, ceiling = 3.5) {
  const widest = Math.max(0, ...text.split(/[\s\u00a0]+/).map(word=>wordWidth(word)*fontSize));
  if (!widest) return ceiling;
  return Math.max(1, Math.min(ceiling, Math.floor(Math.max(0,width)*MARGIN/widest*100)/100));
}
/** Whether every word of `text` fits on one line of `width` points at `fontSize`, with the same safety margin. */
export const wordsFit = (text: string, fontSize: number, width: number) => text.split(/[\s\u00a0]+/).every(word=>wordWidth(word)*fontSize <= Math.max(0,width)*MARGIN);
/**
 * `fontScale` at and above which iOS is at an accessibility text size (AX1 and up; the standard sizes end near 1.35).
 * Shared chrome switches to its large-text layout here: switches stack under their words, and bars collapse.
 */
export const LARGE_TEXT = 1.5;
/** A text cap that applies only at accessibility sizes. Below them it is undefined (no cap), so text is drawn exactly as it was before the cap existed. */
export const atLarge = <T,>(fontScale: number | undefined, cap: T): T | undefined => (fontScale ?? 1) >= LARGE_TEXT ? cap : undefined;
/**
 * Chrome text (titles, intros, section headings) on entry screens stops here at accessibility sizes, so a page of tiles
 * stays reachable; a large decorative title may reach `TITLE_MAX`. Both stop earlier where their longest word would break.
 */
export const CHROME_MAX = 1.5, TITLE_MAX = 2;
/** One multiplier for several texts of the same size, so a row of tiles shares a size and none of them breaks a word. */
export const sharedWordFit = (texts: readonly string[], fontSize: number, width: number, ceiling = TITLE_MAX) =>
  Math.min(ceiling, ...texts.map(text => wordFitMultiplier(text, fontSize, width, ceiling)));
