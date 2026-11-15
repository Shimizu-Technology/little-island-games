import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { Copy } from '../components/ui';
import { useBoardColumns, useBoardSpace } from './BoardSpace';

type CardProps = { onLayout?: (event: LayoutChangeEvent) => void; children?: React.ReactNode };
/** Up to three rows, bounded by remaining primary space. Actual layouts (including wide Again
 * cards) drive both the focus reveal and the visible/VoiceOver hidden-card count. */
export function PlanStrip({ children, count, focus, cardHeight, gap, padding, drawingFloor }: { children: React.ReactNode; count: number; focus: number | null; cardHeight: number; gap: number; padding: number; drawingFloor?: number }) {
  const space = useBoardSpace(), side = useBoardColumns(), scroll = useRef<ScrollView | null>(null), offsetNow = useRef(0);
  const [content, setContent] = useState(0), [height, setHeight] = useState(0), [offset, setOffset] = useState(0);
  const [cards, setCards] = useState<Record<number, { y: number; height: number }>>({});
  const [extent, setExtent] = useState(0);
  const natural = 3 * cardHeight + 2 * gap + 2 * padding;
  // The primary boundary includes this strip. Remove its current measured extent
  // before budgeting its replacement, leaving the drawing at its legibility floor.
  // Reserve both cues so following a card never makes the page jump.
  const cues = 52 * (space?.large ? 1.5 : 1) + 4;
  const remaining = space?.ready && space.chrome !== null && extent > 0 && drawingFloor !== undefined && !side
    ? space.height - space.chrome + extent - drawingFloor : natural;
  const reserve = content > remaining + 1 ? cues : 0;
  const maxHeight = Math.max(cardHeight + 2 * padding, Math.min(natural, Math.floor(remaining - reserve)));
  const card = focus === null || count === 0 ? undefined : cards[Math.min(count - 1, Math.max(0, focus))];
  useEffect(() => {
    if (!card || height <= 0) return;
    const top = card.y, bottom = top + card.height, current = offsetNow.current;
    scroll.current?.scrollTo({ y: Math.max(0, bottom > current + height ? bottom - height + padding : top < current ? top - padding : current), animated: false });
  }, [focus, card, height, padding]);
  if (!space) return <>{children}</>;
  const element = children as React.ReactElement<CardProps>;
  const measured = React.cloneElement(element, {}, React.Children.toArray(element.props.children).map( (child, index) => {
    if (!React.isValidElement<CardProps>(child) || index >= count) return child;
    return React.cloneElement(child, { onLayout: event => {
      child.props.onLayout?.(event);
      const { y, height } = event.nativeEvent.layout;
      setCards(old => old[index]?.y === y && old[index]?.height === height ? old : { ...old, [index]: { y, height } });
    } });
  }));
  const known = Object.entries(cards).filter(([index]) => +index < count).map(([, rect]) => rect);
  const before = known.filter(c => c.y < offset - 1).length;
  const after = known.filter(c => c.y + c.height > offset + height + 1).length;
  return <View testID="plan-strip" onLayout={e => { setExtent(e.nativeEvent.layout.height); space.changed(); }} style={{ gap: 2 }}>
    {before > 0 && <Copy testID="plan-more-above" maxFontSizeMultiplier={1.5} accessibilityLabel={`${before} more cards above. Scroll up.`} style={{ fontSize: 13, fontWeight: '700' }}>↑ {before} more cards</Copy>}
    <ScrollView ref={scroll} nestedScrollEnabled style={{ maxHeight, flexGrow: 0 }} onLayout={e => setHeight(e.nativeEvent.layout.height)} onContentSizeChange={(_w, h) => setContent(h)} onScroll={e => { offsetNow.current = e.nativeEvent.contentOffset.y; setOffset(offsetNow.current); }} scrollEventThrottle={16} accessibilityLabel="Your plan cards">{measured}</ScrollView>
    {content > height + 1 && after > 0 && <Copy testID="plan-more-below" maxFontSizeMultiplier={1.5} accessibilityLabel={`${after} more cards below. Scroll down.`} style={{ fontSize: 13, fontWeight: '700' }}>↓ {after} more cards</Copy>}
  </View>;
}
