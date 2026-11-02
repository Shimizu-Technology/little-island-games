/** Remove only the reviewed SVG's full-canvas paper rectangle at render time.
 * Subject geometry, aspect ratio, labels and source files remain unchanged.
 * Unknown formats retain their original background rather than losing diagram marks.
 */
export function sceneVector(xml: string, focus?: string): string {
  const view = xml.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!view) return xml;
  const framed = xml.replace(/<rect\b[^>]*\/?>(?:<\/rect>)?/, (rect) => {
    const attribute = (name: string) => rect.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
    return attribute("width") === view[1] &&
      attribute("height") === view[2] &&
      (!attribute("x") || attribute("x") === "0") &&
      (!attribute("y") || attribute("y") === "0")
      ? ""
      : rect;
  });
  return focus ? framed.replace(/viewBox="[^"]+"/, `viewBox="${focus}"`) : framed;
}
