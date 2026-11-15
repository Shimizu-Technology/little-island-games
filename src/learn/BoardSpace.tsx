import { StepReveal } from './stepReveal';
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import { fitSchoolBoard, type BoardSpace, type SchoolBoard } from './boardGeometry';

type Region = { id: SchoolBoard; height: number };
type Measurements = { content: number; regions: Partial<Record<SchoolBoard, Region>> };
type MeasuredSpace = BoardSpace & { onReveal?: () => void; ready: boolean; chrome: number | null; select: (id: SchoolBoard | null) => void; measure: (id: SchoolBoard, height: number) => void };
const Space = createContext<MeasuredSpace | null>(null);
const ContentLayout = createContext<((event: LayoutChangeEvent) => void) | undefined>(undefined);

/** Only School opts in. Layout callbacks are coalesced so a resized board and its
 * parent are measured in the same layout pass, rather than feeding stale heights back. */
export function BoardSpaceProvider({ space, children, onReveal }: { space: BoardSpace | null; children: React.ReactNode; onReveal?: () => void }) {
  const pending = useRef<Measurements>({ content: 0, regions: {} }), selected = useRef<SchoolBoard | null>(null);
  const [chrome, setChrome] = useState<number | null>(null);
  const frame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const flush = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const { content, regions } = pending.current, region = selected.current ? regions[selected.current] : null;
      if (content > 0 && region && region.id === selected.current) {
        const next = Math.max(0, content - region.height);
        setChrome(old => old !== null && Math.abs(old - next) < 1 ? old : next);
      }
    });
  }, []);
  useLayoutEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const select = useCallback((id: SchoolBoard | null) => {
    selected.current = id;
    if (id !== null) { setChrome(null); flush(); }
  }, [flush]);
  const measure = useCallback((id: SchoolBoard, height: number) => {
    pending.current.regions[id] = { id, height }; flush();
  }, [flush]);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    pending.current.content = event.nativeEvent.layout.height; flush();
  }, [flush]);
  const value = useMemo(() => ({ ...(space ?? { width: 0, height: 0, large: false }), ready: space !== null, onReveal, chrome, select, measure }), [space, onReveal, chrome, select, measure]);
  return <Space.Provider value={value}><ContentLayout.Provider value={onLayout}>{children}</ContentLayout.Provider></Space.Provider>;
}

export const useBoardSpace = () => useContext(Space);
export const useBoardContentLayout = () => useContext(ContentLayout);

/** One flexible drawing per board. Block mode gives that allocation to ProgramEditor;
 * the map and run buttons retain their floor beside each other. Everything else
 * (plan strip, captions, commands, keys and actions) is measured as reserved chrome. */
export function useBoardGeometry(id: SchoolBoard, natural: number, minimum: number, enabled = true) {
  const space = useBoardSpace(), select = space?.select, measure = space?.measure;
  useLayoutEffect(() => {
    if (!enabled || !select) return;
    select(id);
    return () => select(null);
  }, [id, enabled, select]);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    if (enabled) measure?.(id, event.nativeEvent.layout.height);
  }, [id, enabled, measure]);
  const geometry = fitSchoolBoard(enabled && space?.ready && space.chrome !== null ? space : null, natural, minimum, space?.chrome ?? 0);
  const wrapPlan = (children: React.ReactNode, maxHeight: number, compactHeight = maxHeight) => space ? <ScrollView nestedScrollEnabled style={{ maxHeight: space.ready && space.height < 600 ? compactHeight : maxHeight, flexGrow: 0 }} accessibilityLabel="Your plan cards">{children}</ScrollView> : children;
  return { ...geometry, testID: space ? `school-${id}-drawing` : undefined, wrapPlan, onLayout: enabled && space ? onLayout : undefined, measured: !!space?.ready };
}

/** The existing LearnFrame inset, also measuring all fixed siblings of the drawing. */
export function BoardSpaceContent({ onLayout, ...props }: ViewProps) {
  const measure = useBoardContentLayout(), space = useBoardSpace(), stepReveal = useContext(StepReveal);
  const reveal = space?.onReveal ?? stepReveal;
  const lastWindow = useRef<string | null>(null);
  // Reuse the existing non-animated reveal once on entry/rotation. A changing plan,
  // companion, measured width or text size alone must not pull the child away.
  useEffect(() => {
    if (!space?.ready || space.anchorReady === false) return;
    const key = space.layoutKey ?? String(space.width);
    if (lastWindow.current === key) return;
    if (!(space.reveal ?? space.large)) { lastWindow.current = key; return; }
    const frame = requestAnimationFrame(() => {
      if (lastWindow.current === key) return;
      lastWindow.current = key;
      reveal();
    });
    return () => cancelAnimationFrame(frame);
  }, [space?.ready, space?.anchorReady, space?.layoutKey, space?.width, space?.large, space?.reveal, reveal]);
  return <View {...props} onLayout={event => { measure?.(event); onLayout?.(event); }} />;
}

