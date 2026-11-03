import React from "react";
import Svg, { Path } from "react-native-svg";
/** Shared ink-and-paper controls. Labels belong to the enclosing button. */
export function LibraryGlyph({ name, size = 28 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    back: "M22 7 12 16l10 9M12 16h17",
    next: "m10 7 10 9-10 9M20 16H3",
    lock: "M10 13V9a6 6 0 0 1 12 0v4M7 13h18v16H7ZM16 19v4",
    heart: "M16 27 5 17C-3 7 10 0 16 10 22 0 35 7 27 17Z",
    info: "M16 29a13 13 0 1 0 0-26 13 13 0 0 0 0 26ZM16 14v9M16 8v2",
    sound: "m4 12 7-1 7-6v22l-7-6-7-1ZM23 8q10 8 0 16M23 13q4 3 0 6",
    muted: "m4 12 7-1 7-6v22l-7-6-7-1ZM23 12l7 8m0-8-7 8",
    listen: "M4 12q6-8 12 0-6 8-12 0ZM10 11v2M21 19q10-12 6-15-8-5-11 3M22 10q4-2 4 2c0 4-6 3-5 9q1 7 6 4",
    eraser: "m4 20 14-15 11 10-12 14H13ZM10 14l11 10M17 29h13",
    undo: "M12 5 3 13l9 8M3 13h16c14 0 12 16 0 16",
    redo: "m20 5 9 8-9 8M29 13H13C-1 13 1 29 13 29",
    stamps: "M12 17V8a4 4 0 0 1 8 0v9l6 5v5H6v-5ZM5 31h22",
    details: "m7 12 9 9 9-9",
    make: "m6 23-1 5 6-1L28 10l-5-5ZM20 8l5 5M6 23l5 4",
    wonder: "M23 13a10 10 0 1 0-20 0 10 10 0 0 0 20 0Zm-3 8 9 9M8 13h10M13 8v10",
    shelf: "M3 27h26M3 15h26M7 5v10M13 3v12M19 6l4 9M7 19v8M14 18v9M22 20v7",
    layer: "M5 6h22v22H5ZM10 6v22M5 22h22",
    books: "M3 6q6-3 13 1 7-4 13-1v20q-6-3-13 1-7-4-13-1ZM16 7v20",
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="#254E4B"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      <Path
        d={paths[name] ?? paths.books}
        fill={["heart", "make", "layer", "books", "lock"].includes(name) ? "#EBD3A0" : "none"}
      />
    </Svg>
  );
}
