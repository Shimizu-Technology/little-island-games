import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, Filter, FeColorMatrix, G } from 'react-native-svg';
import { IslanderShape, resolvePose, type IslanderLook } from '../islander';
import { C, Copy, PressableScale } from '../components/ui';
import { lockedReason, selectedValue, styleCatalog, type Category, type StyleItem } from './catalog';
import { LockBadge, LockIcon } from './LockBadge';
import { thumbnailFocus } from './thumbnail';
export function StyleGrid({ category, look, equipped, earned, unseen, onChoose, catalog = styleCatalog, compact = false }: { category: Category; look: IslanderLook; equipped: IslanderLook; earned: string[]; unseen: string[]; onChoose: (item: StyleItem) => void; compact?: boolean; catalog?: readonly StyleItem[] }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 6 : 10 }}>{catalog.filter(i => i.category === category).map(item => {
    const selected = selectedValue(look, item.category) === item.value, worn = selectedValue(equipped, item.category) === item.value, reason = lockedReason(item, earned);
    return <PressableScale key={item.id} accessibilityRole="button" accessibilityLabel={`${item.label}${reason ? ', locked. ' + reason : ''}${selected ? ', previewing' : ''}${worn ? ', wearing' : ''}`} accessibilityState={{ selected }} onPress={() => onChoose(item)} style={{ flexBasis: '31%', flexGrow: 0, minWidth: 96, minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 2, padding: 4, borderWidth: 2, borderColor: selected ? C.teal : C.line, backgroundColor: selected ? C.soft : C.paper, borderRadius: 18 }}>
      {item.color ? <View style={{ width: 42, height: 42, borderRadius: 24, backgroundColor: reason ? '#A4A4A4' : item.color, opacity: reason ? .48 : 1, borderWidth: 1, borderColor: C.muted }}/> : <Svg width={86} height={86} viewBox={thumbnailFocus(item).box} accessible={false}><Defs><Filter id={`muted-${item.id}`}><FeColorMatrix type="saturate" values="0"/></Filter></Defs><G opacity={reason ? .48 : 1} filter={reason ? `url(#muted-${item.id})` : undefined}><IslanderShape pose={resolvePose(thumbnailFocus(item).view, thumbnailFocus(item).view === 'back' ? 0 : 'idle')} look={{ ...look, [item.category]: item.value }}/></G></Svg>}
      {!!reason && <LockBadge/>}
      <Copy style={{ fontWeight: '700', fontSize: 15, lineHeight: 18 }}>{item.label}</Copy>
      {(selected || worn) && <Copy style={{ fontSize: 10, lineHeight: 11 }}>{selected ? 'Previewing' : 'Wearing'}</Copy>}
      {!!reason && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><LockIcon/><Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 16, flexShrink: 1, color: C.ink }}>{item.track}</Text></View>}
      {unseen.includes(item.id) && <Copy style={{ fontSize: 12 }}>New</Copy>}

    </PressableScale>;
  })}</View>;
}
