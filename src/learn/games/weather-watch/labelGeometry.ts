/** Conservative bold-label advance, used only to wrap within reserved SVG boxes.
 * Native captions handle longer object names without a line limit or font reduction. */
export function sceneLabelLines(text: string, fontSize: number, width: number) {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const previous = lines.at(-1);
    if (previous && `${previous} ${word}`.length * fontSize * .65 <= width) lines[lines.length - 1] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}
