import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Islander, type IslanderLook } from '../islander';
import { C, Copy, PressableScale } from '../components/ui';
import { lockedReason, selectedValue, styleCatalog, type Category, type StyleItem } from './catalog';
export function StyleGrid({ category, look, equipped, earned, unseen, onChoose, catalog = styleCatalog, compact = false }: { category: Category; look: IslanderLook; equipped: IslanderLook; earned: string[]; unseen: string[]; onChoose: (item: StyleItem) => void; compact?: boolean; catalog?: readonly StyleItem[] }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 6 : 10 }}>{catalog.filter(i => i.category === category).map(item => {
    const selected = selectedValue(look, item.category) === item.value, worn = selectedValue(equipped, item.category) === item.value, reason = lockedReason(item, earned);
    return <PressableScale key={item.id} accessibilityRole="button" accessibilityLabel={`${item.label}${reason ? ', locked. ' + reason : ''}${selected ? ', previewing' : ''}${worn ? ', wearing' : ''}`} accessibilityState={{ selected }} onPress={() => onChoose(item)} style={{ flexBasis: '31%', flexGrow: 0, minWidth: 96, minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 2, padding: 4, borderWidth: 2, borderColor: selected ? C.teal : C.line, backgroundColor: selected ? C.soft : C.paper, borderRadius: 18 }}>
      {item.color ? <View style={{ width: 42, height: 42, borderRadius: 24, backgroundColor: item.color, borderWidth: 1, borderColor: C.muted }}/> : <View style={{ width: 86, height: 86, overflow: 'hidden', alignItems: 'center' }}><View style={{ position: 'absolute', top: item.category === 'accessory' && item.value === 'backpack' ? -45 : 0 }}><Islander view={item.value === 'backpack' ? 'back' : 'front'} pose={item.value === 'backpack' ? 0 : 'idle'} size={['hat', 'hairStyle', 'accessory'].includes(item.category) ? 158 : 86} look={{ ...look, [item.category]: item.value }}/></View></View>}
      <Copy style={{ fontWeight: '700', fontSize: 15, lineHeight: 18 }}>{item.label}</Copy>
      {(selected || worn) && <Copy style={{ fontSize: 10, lineHeight: 11 }}>{selected ? 'Previewing' : 'Wearing'}</Copy>}
      {(reason || unseen.includes(item.id)) && <Copy style={{ fontSize: 12, ...(compact ? { lineHeight: 16 } : {}) }}>{reason ? 'Locked' : ''}{unseen.includes(item.id) ? ' · New' : ''}</Copy>}
      {!compact && !!reason && <Copy style={{ fontSize: 12, textAlign: 'center' }}>{reason}</Copy>}
      {!compact && !!reason && <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}><Path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke={C.ink} strokeWidth={2}/><Rect x={5} y={10} width={14} height={11} rx={3} fill={C.gold} stroke={C.ink} strokeWidth={2}/></Svg>}

    </PressableScale>;
  })}</View>;
}
