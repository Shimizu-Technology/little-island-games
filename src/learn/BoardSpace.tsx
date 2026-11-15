import { StepReveal } from './stepReveal';
import { nextLayoutFrame } from './frameClocks';
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions, type LayoutChangeEvent, type ViewProps } from 'react-native';
import { fitSchoolBoard, type BoardSpace, type SchoolBoard } from './boardGeometry';

type MeasuredSpace = BoardSpace & {
  onReveal?: () => void; geometryEnabled: boolean; ready: boolean; chrome: number | null;
  select: (id: SchoolBoard | null) => void; measure: (id: SchoolBoard, height: number) => void;
  content: React.RefObject<View | null>; primary: React.RefObject<View | null>;
  rowView: React.RefObject<View | null>; drawingColumn: React.RefObject<View | null>; row: () => void; changed: () => void;
};
const Space = createContext<MeasuredSpace | null>(null);

/** A primary boundary is measured relative to the inset, never the screen or scroll
 * offset. Secondary help below it cannot take space from the drawing. Layout events
 * share one frame so a resized drawing and its parent cannot feed stale heights back. */
export function BoardSpaceProvider({ space, children, onReveal, geometryEnabled = true }: { space: BoardSpace | null; children: React.ReactNode; onReveal?: () => void; geometryEnabled?: boolean }) {
  const content = useRef<View | null>(null), primary = useRef<View | null>(null);
  const selected = useRef<SchoolBoard | null>(null), regions = useRef(new Map<SchoolBoard, number>());
  const rowView = useRef<View | null>(null), drawingColumn = useRef<View | null>(null), lastChrome = useRef(new Map<SchoolBoard, number>());
  const [chrome, setChrome] = useState<number | null>(null);
  const disposed = useRef(false);
  const frame = useRef<(() => void) | null>(null), revision = useRef(0);
  const changed = useCallback(() => {
    if (disposed.current) return;
    revision.current++;
    if (frame.current !== null) return;
    frame.current = nextLayoutFrame(() => {
      frame.current = null;
      const id = selected.current, drawing = id && regions.current.get(id), at = revision.current;
      if (!id || drawing == null || !content.current || !primary.current) return;
      primary.current.measureLayout(content.current, (_x, y, _w, height) => {
        if (disposed.current || at !== revision.current || selected.current !== id) return;
        // In a row, the taller column sets its height. Its excess is not chrome.
        const save = (reserve: number) => {
          if (disposed.current || at !== revision.current || selected.current !== id) return;
          const next = Math.max(0, reserve);
          lastChrome.current.set(id, next);
          setChrome(old => old !== null && Math.abs(old - next) < 1 ? old : next);
        };
        if (rowView.current) rowView.current.measureLayout(content.current!, (_rx, ry, _rw, rh) => {
          const outside = ry + Math.max(0, y + height - ry - rh);
          // Captions/padding in the drawing's own column still need room. A
          // taller sibling column does not. Hosts with an inner map/run row
          // can omit this column measurement and declare that row directly.
          if (drawingColumn.current) drawingColumn.current.measureLayout(content.current!, (_cx, _cy, _cw, ch) => save(outside + Math.max(0, ch - drawing)));
          else save(outside);
        });
        else save(y + height - drawing);
      });
    });
  }, []);
  useLayoutEffect(() => { disposed.current = false; return () => { disposed.current = true; frame.current?.(); frame.current = null; }; }, []);
  const select = useCallback((id: SchoolBoard | null) => {
    if (selected.current) regions.current.delete(selected.current);
    selected.current = id;
    // Keep the last allocation on remount; only a fresh layout may replace it.
    if (id !== null) { const previous = lastChrome.current.get(id); if (previous !== undefined) setChrome(previous); }
    changed();
  }, [changed]);
  const measure = useCallback((id: SchoolBoard, height: number) => { regions.current.set(id, height); changed(); }, [changed]);
  const row = useCallback(() => { changed(); }, [changed]);
  const value = useMemo(() => ({ ...(space ?? { width: 0, height: 0, large: false }), ready: space !== null, geometryEnabled, onReveal, chrome, select, measure, content, primary, rowView, drawingColumn, row, changed }), [space, geometryEnabled, onReveal, chrome, select, measure, row, changed]);
  return <Space.Provider value={value}>{children}</Space.Provider>;
}
/** Shared renderers in unported games retain their legacy geometry. Entry reveal
 * remains available independently through BoardSpaceContent. */
export const useBoardSpace = () => { const space = useContext(Space); return space?.geometryEnabled ? space : null; };

export function useBoardGeometry(id: SchoolBoard, natural: number, minimum: number, enabled = true) {
  const space = useBoardSpace(), select = space?.select, measure = space?.measure;
  useLayoutEffect(() => { if (!enabled || !select) return; select(id); return () => select(null); }, [id, enabled, select]);
  const onLayout = useCallback((event: LayoutChangeEvent) => { if (enabled) measure?.(id, event.nativeEvent.layout.height); }, [id, enabled, measure]);
  const geometry = fitSchoolBoard(enabled && space?.ready && space.chrome !== null ? space : null, natural, minimum, space?.chrome ?? 0);
  return { ...geometry, testID: enabled && space ? `school-${id}-drawing` : undefined, onLayout: enabled && space ? onLayout : undefined, measured: enabled && !!space?.ready };
}

/** End of the primary interaction, including its containing row when beside art. */
export function BoardPrimary({ onLayout, ...props }: ViewProps) {
  const space = useBoardSpace();
  return <View {...props} testID={props.testID ?? 'school-primary'} ref={space?.primary} collapsable={false} onLayout={event => { space?.changed(); onLayout?.(event); }} />;
}
/** Use only on the row containing the selected flexible drawing. */
export function BoardRow({ onLayout, ...props }: ViewProps) {
  const space = useBoardSpace(), row = space?.row;
  useLayoutEffect(() => () => row?.(), [row]);
  return <View {...props} ref={space?.rowView} collapsable={false} testID={props.testID ?? 'school-drawing-row'} onLayout={event => { row?.(); onLayout?.(event); }} />;
}
export function useBoardColumns() {
  const space = useBoardSpace(), window = useWindowDimensions();
  return !!space?.ready && space.width >= 520 && window.width > window.height;
}
/** A single primary row: drawing left, controls right on wide landscape windows. */
export function BoardColumns({ drawing, children, side: override, drawingWidth, legacyDrawingLast = false, gap = 8, flexibleColumn = 'drawing', reserveColumnChrome = true }: { drawing: React.ReactNode; children: React.ReactNode; side?: boolean; drawingWidth?: number; legacyDrawingLast?: boolean; gap?: number; flexibleColumn?: 'drawing' | 'controls'; reserveColumnChrome?: boolean }) {
  const wide = useBoardColumns(), space = useBoardSpace(), side = override ?? wide;
  if (!space) return <>{legacyDrawingLast ? <>{children}{drawing}</> : <>{drawing}{children}</>}</>;
  const column = (which: 'drawing' | 'controls') => side && reserveColumnChrome && flexibleColumn === which ? { ref: space.drawingColumn, testID: 'school-drawing-column', onLayout: space.changed, collapsable: false } : {};
  const art = <View {...column('drawing')} style={side ? { width: drawingWidth ?? '46%', alignItems: 'center' } : undefined}>{drawing}</View>;
  const controls = <View {...column('controls')} style={side ? { flex: 1, minWidth: 0, gap } : { gap }}>{children}</View>;
  const body = !side && legacyDrawingLast ? <>{controls}{art}</> : <>{art}{controls}</>;
  return <BoardPrimary>{side ? <BoardRow style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>{body}</BoardRow> : <View style={{ gap }}>{body}</View>}</BoardPrimary>;
}

export function BoardSpaceContent({ onLayout, ...props }: ViewProps) {
  const space = useContext(Space), stepReveal = useContext(StepReveal), reveal = space?.onReveal ?? stepReveal;
  const lastWindow = useRef<string | null>(null);
  useEffect(() => {
    if (!space?.ready || space.anchorReady === false) return;
    const key = space.layoutKey ?? String(space.width);
    if (lastWindow.current === key) return;
    if (!(space.reveal ?? space.large)) { lastWindow.current = key; return; }
    return nextLayoutFrame(() => { if (lastWindow.current !== key) { lastWindow.current = key; reveal(); } });
  }, [space?.ready, space?.anchorReady, space?.layoutKey, space?.width, space?.large, space?.reveal, reveal]);
  return <View {...props} ref={space?.content} collapsable={false} onLayout={event => { space?.changed(); onLayout?.(event); }} />;
}
