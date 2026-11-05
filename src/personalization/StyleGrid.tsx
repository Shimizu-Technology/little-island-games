import React, { memo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Filter, FeColorMatrix, G } from 'react-native-svg';
import { IslanderShape, resolvePose, type IslanderLook } from '../islander';
import { C, Copy, PressableScale } from '../components/ui';
import { audienceLabels, audienceOrder, lookWithStyle, lockedReason, selectedValue, styleCatalog, type Category, type StyleItem } from './catalog';
import { LockBadge, LockIcon } from './LockBadge';
import { thumbnailFocus } from './thumbnail';
/** Redraws only when this tile's own picture changes, so tapping a style does not repaint the whole grid. */
const Thumb = memo(function Thumb({ item, muted, encoded, compact, selected }: { item: StyleItem; muted: boolean; encoded: string; compact: boolean; selected: boolean }) {
  const shown = JSON.parse(encoded) as IslanderLook, focus = thumbnailFocus(item);
  const pose = resolvePose(focus.view, focus.view === 'back' ? 0 : 'idle');
  return <View style={{ width: compact ? 72 : 108, height: compact ? 72 : 108, borderRadius: compact ? 18 : 24, borderWidth: 3, borderColor: selected ? C.teal : '#E9E9DE', backgroundColor: '#FFF4E7', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>{item.color ? <><Svg width={compact ? 62 : 96} height={compact ? 62 : 96} viewBox={focus.box} accessible={false}><IslanderShape pose={pose} look={shown}/></Svg><View style={{ position: 'absolute', bottom: 3, right: 3, width: 26, height: 26, borderRadius: 13, backgroundColor: muted ? '#A4A4A4' : item.color, borderWidth: 2, borderColor: '#FFFFFF' }}/></> : <Svg width={compact ? 66 : 102} height={compact ? 66 : 102} viewBox={focus.box} accessible={false}><Defs><Filter id={`muted-${item.id}`}><FeColorMatrix type="saturate" values="0"/></Filter></Defs><G opacity={muted ? .48 : 1} filter={muted ? `url(#muted-${item.id})` : undefined}><IslanderShape pose={pose} look={shown}/></G></Svg>}</View>;
});
export function StyleGrid({ category, look, equipped, earned, unseen, onChoose, catalog = styleCatalog, compact = false }: { category: Category; look: IslanderLook; equipped: IslanderLook; earned: string[]; unseen: string[]; onChoose: (item: StyleItem) => void; compact?: boolean; catalog?: readonly StyleItem[] }) {
  const { width } = useWindowDimensions();
  const tileWidth = width < 420 ? '47%' : width < 700 ? '31%' : width < 1100 ? '47%' : '31%';
  const items = catalog.filter(i => i.category === category), sorted = items.some(i => i.audience);
  const tiles = (list: readonly StyleItem[]) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 6 : 10 }}>{list.map(item => {
    const selected = selectedValue(look, item.category) === item.value, worn = selectedValue(equipped, item.category) === item.value, reason = lockedReason(item, earned);
    return <PressableScale key={item.id} accessibilityRole="button" accessibilityLabel={`${item.label}${reason ? ', locked. ' + reason : ''}${selected ? ', previewing' : ''}${worn ? ', wearing' : ''}`} accessibilityState={{ selected }} onPress={() => onChoose(item)} style={{ width: tileWidth, minWidth: 96, minHeight: compact ? 108 : 148, alignItems: 'center', justifyContent: 'center', gap: compact ? 1 : 3, padding: compact ? 3 : 5, borderWidth: 2, borderColor: selected ? C.teal : C.line, backgroundColor: selected ? '#E7F2E7' : C.paper, borderRadius: 22 }}>
      <Thumb item={item} muted={!!reason} encoded={JSON.stringify(lookWithStyle(look, item))} compact={compact} selected={selected}/>
      {!!reason && <LockBadge/>}
      <Copy style={{ fontWeight: '700', fontSize: 14, lineHeight: 17, textAlign: 'center', color: C.ink }}>{item.label}</Copy>
      {(selected || worn) && <Copy style={{ fontSize: 10, lineHeight: 11 }}>{selected ? 'Previewing' : 'Wearing'}</Copy>}
      {!!reason && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><LockIcon/><Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 16, flexShrink: 1, color: C.ink }}>{item.track}</Text></View>}
      {unseen.includes(item.id) && <Copy style={{ fontSize: 12 }}>New</Copy>}

    </PressableScale>;
  })}</View>;
  if (!sorted) return tiles(items);
  return <View style={{ gap: 12 }}>
    {audienceOrder(look.presentation).map(audience => { const list = items.filter(i => (i.audience ?? 'everyone') === audience); return list.length ? <View key={audience} testID={`style-section-${audience}`} style={{ gap: 6 }}><Text accessibilityRole="header" style={{ fontSize: 15, lineHeight: 20, fontWeight: '800', color: C.ink }}>{audienceLabels[audience]}</Text>{tiles(list)}</View> : null; })}
  </View>;
}
