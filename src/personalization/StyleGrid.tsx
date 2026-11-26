import React, { memo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Filter, FeColorMatrix, G } from 'react-native-svg';
import { IslanderShape, resolvePose, type IslanderLook } from '../islander';
import { C, Copy, PressableScale } from '../components/ui';
import { audienceLabels, audienceOrder, lookWithStyle, lockedReason, selectedValue, styleCatalog, type Category, type StyleItem } from './catalog';
import { LockBadge, LockIcon } from './LockBadge';
import { thumbnailFocus } from './thumbnail';
/** Redraws only when this tile's own picture changes, so tapping a style does not repaint the whole grid. */
const Thumb = memo(function Thumb({ item, muted, encoded, frame, selected }: { item: StyleItem; muted: boolean; encoded: string; frame: number; selected: boolean }) {
  const shown = JSON.parse(encoded) as IslanderLook, focus = thumbnailFocus(item);
  const pose = resolvePose(focus.view, focus.view === 'back' ? 0 : 'idle');
  const compact = frame < 90, swatch = frame - (compact ? 10 : 12), art = frame - 6;
  return <View style={{ width: frame, height: frame, borderRadius: compact ? 18 : 24, borderWidth: selected ? 3 : 2, borderColor: selected ? '#FF7A5C' : '#EFE2CE', backgroundColor: '#FFF8EC', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>{item.color ? <><Svg width={swatch} height={swatch} viewBox={focus.box} accessible={false}><IslanderShape pose={pose} look={shown}/></Svg><View style={{ position: 'absolute', bottom: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: muted ? '#A4A4A4' : item.color, borderWidth: 2.5, borderColor: '#FFFDF8' }}/></> : <Svg width={art} height={art} viewBox={focus.box} accessible={false}><Defs><Filter id={`muted-${item.id}`}><FeColorMatrix type="saturate" values="0"/></Filter></Defs><G opacity={muted ? .48 : 1} filter={muted ? `url(#muted-${item.id})` : undefined}><IslanderShape pose={pose} look={shown}/></G></Svg>}</View>;
});
export function StyleGrid({ category, look, equipped, earned, unseen, onChoose, catalog = styleCatalog, compact = false }: { category: Category; look: IslanderLook; equipped: IslanderLook; earned: string[]; unseen: string[]; onChoose: (item: StyleItem) => void; compact?: boolean; catalog?: readonly StyleItem[] }) {
  const { width } = useWindowDimensions();
  // Three across on phones, so a pinned preview still leaves several choices in view.
  const phone = width < 420, tileWidth = phone ? '31%' : width < 700 ? '31%' : width < 1100 ? '47%' : '31%', frame = compact ? 72 : phone && width >= 360 ? 90 : 108;
  const items = catalog.filter(i => i.category === category), sorted = items.some(i => i.audience);
  const tiles = (list: readonly StyleItem[]) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 6 : 10 }}>{list.map(item => {
    const selected = selectedValue(look, item.category) === item.value, worn = selectedValue(equipped, item.category) === item.value, reason = lockedReason(item, earned);
    return <PressableScale key={item.id} accessibilityRole="button" accessibilityLabel={`${item.label}${reason ? ', locked. ' + reason : ''}${selected ? ', previewing' : ''}${worn ? ', wearing' : ''}`} accessibilityState={{ selected }} onPress={() => onChoose(item)} style={{ width: tileWidth, minWidth: 96, minHeight: compact ? 108 : phone ? 128 : 148, alignItems: 'center', justifyContent: 'center', gap: compact ? 2 : 4, padding: compact ? 4 : 6, borderWidth: selected ? 2.5 : 1.5, borderColor: selected ? '#FF7A5C' : '#EFE0C6', backgroundColor: selected ? '#FFF1E8' : '#FFFDF8', borderRadius: 24 }}>
      <Thumb item={item} muted={!!reason} encoded={JSON.stringify(lookWithStyle(look, item))} frame={frame} selected={selected}/>
      {!!reason && <LockBadge/>}
      <Copy maxFontSizeMultiplier={1.2} style={{ fontWeight: '700', fontSize: 14, lineHeight: 17, textAlign: 'center', color: C.ink }}>{item.label}</Copy>
      {(selected || worn) && <View style={{ paddingHorizontal: 8, paddingVertical: 1.5, borderRadius: 10, backgroundColor: selected ? '#FFDAD0' : '#DDF3EC' }}><Copy maxFontSizeMultiplier={1.2} style={{ fontSize: 10, lineHeight: 12, fontWeight: '700', color: '#173330' }}>{selected ? 'Previewing' : 'Wearing'}</Copy></View>}
      {!!reason && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><LockIcon/><Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 11, lineHeight: 16, flexShrink: 1, color: C.ink }}>{item.track}</Text></View>}
      {unseen.includes(item.id) && <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 10, backgroundColor: '#FF7A5C' }}><Copy maxFontSizeMultiplier={1.2} style={{ fontSize: 11, lineHeight: 14, fontWeight: '800', color: '#173330' }}>New</Copy></View>}

    </PressableScale>;
  })}</View>;
  if (!sorted) return tiles(items);
  return <View style={{ gap: 12 }}>
    {audienceOrder(look.presentation).map(audience => { const list = items.filter(i => (i.audience ?? 'everyone') === audience); return list.length ? <View key={audience} testID={`style-section-${audience}`} style={{ gap: 6 }}><Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={{ fontSize: 15, lineHeight: 20, fontWeight: '800', color: C.ink }}>{audienceLabels[audience]}</Text>{tiles(list)}</View> : null; })}
  </View>;
}
