import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Islander, type IslanderLook } from '../islander';
import { C, Copy, PressableScale } from '../components/ui';
import { lockedReason, selectedValue, styleCatalog, type Category, type StyleItem } from './catalog';
export function StyleGrid({ category, look, equipped, earned, unseen, onChoose, catalog = styleCatalog }: { category: Category; look: IslanderLook; equipped: IslanderLook; earned: string[]; unseen: string[]; onChoose: (item: StyleItem) => void; catalog?: readonly StyleItem[] }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{catalog.filter(i => i.category === category).map(item => {
    const selected = selectedValue(look, item.category) === item.value, worn = selectedValue(equipped, item.category) === item.value, reason = lockedReason(item, earned);
    return <PressableScale key={item.id} accessibilityRole="button" accessibilityLabel={`${item.label}${reason ? ', locked. ' + reason : ''}${selected ? ', previewing' : ''}${worn ? ', wearing' : ''}`} accessibilityState={{ selected }} onPress={() => onChoose(item)} style={{ width: '47%', minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 10, borderWidth: 2, borderColor: selected ? C.teal : C.line, backgroundColor: selected ? C.soft : C.paper, borderRadius: 18 }}>
      {item.color ? <View style={{ width: 42, height: 42, borderRadius: 24, backgroundColor: item.color, borderWidth: 1, borderColor: C.muted }}/> : <Islander view="front" pose="idle" size={72} look={{ ...look, [item.category]: item.value }}/>}
      <Copy style={{ fontWeight: '700', fontSize: 15 }}>{item.label}</Copy>
      <Copy style={{ fontSize: 12 }}>{reason ? 'Locked · ' : ''}{selected ? 'Previewing' : worn ? 'Wearing' : 'Try on'}{unseen.includes(item.id) ? ' · New' : ''}</Copy>
      {!!reason && <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}><Path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke={C.ink} strokeWidth={2}/><Rect x={5} y={10} width={14} height={11} rx={3} fill={C.gold} stroke={C.ink} strokeWidth={2}/></Svg>}
      {!!reason && <Copy style={{ fontSize: 12, textAlign: 'center' }}>{reason}</Copy>}
    </PressableScale>;
  })}</View>;
}
