import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { Copy } from '../components/ui';
import { useBoardSpace } from './BoardSpace';

type CardProps = { onLayout?: (event: LayoutChangeEvent) => void; children?: React.ReactNode };
/** Three complete rows before scrolling. Actual card layouts (including wide Again
 * cards) drive both the focus reveal and the visible/VoiceOver hidden-card count. */
export function PlanStrip({ children, count, focus, cardHeight, gap, padding }: { children: React.ReactNode; count: number; focus: number | null; cardHeight: number; gap: number; padding: number }) {
  const space = useBoardSpace(), scroll = useRef<ScrollView | null>(null), offsetNow = useRef(0);
  const [content, setContent] = useState(0), [height, setHeight] = useState(0), [offset, setOffset] = useState(0);
  const [cards, setCards] = useState<Record<number, { y: number; height: number }>>({});
  const maxHeight = 3 * cardHeight + 2 * gap + 2 * padding;
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
  return <View style={{ gap: 2 }}>
    {before > 0 && <Copy testID="plan-more-above" accessibilityLabel={`${before} more cards above. Scroll up.`} style={{ fontSize: 13, fontWeight: '700' }}>↑ {before} more cards</Copy>}
    <ScrollView ref={scroll} nestedScrollEnabled style={{ maxHeight, flexGrow: 0 }} onLayout={e => setHeight(e.nativeEvent.layout.height)} onContentSizeChange={(_w, h) => setContent(h)} onScroll={e => { offsetNow.current = e.nativeEvent.contentOffset.y; setOffset(offsetNow.current); }} scrollEventThrottle={16} accessibilityLabel="Your plan cards">{measured}</ScrollView>
    {content > height + 1 && after > 0 && <Copy testID="plan-more-below" accessibilityLabel={`${after} more cards below. Scroll down.`} style={{ fontSize: 13, fontWeight: '700' }}>↓ {after} more cards</Copy>}
  </View>;
}
