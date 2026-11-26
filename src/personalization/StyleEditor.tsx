import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View, useWindowDimensions, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Islander, presentationPresets, type IslanderLook } from '../islander';
import { C, Copy, Heading, PressableScale } from '../components/ui';
import { Icon } from '../components/Icon';
import { categories, lockedReason, lookWithStyle, styleCatalog, type Category, type StyleItem } from './catalog';
import { LockRule } from './LockBadge';
import { StyleGrid } from './StyleGrid';
import { editorLayout, MIN_GRID } from './editorLayout';

type Tab = Category | 'presentation' | 'build' | 'shoes' | 'shoeColor';
type Group = { name: string; color: string; tint: string; tabs: Tab[] };
const groups: Group[] = [
  { name: 'Me', color: '#E2A42B', tint: '#FFF3C9', tabs: ['presentation', 'skinTone', 'build'] },
  { name: 'Head', color: '#1E8A83', tint: '#D4F3EC', tabs: ['hairStyle', 'hairColor', 'brows', 'lashes', 'freckles', 'cheeks'] },
  { name: 'Clothes', color: '#E26C52', tint: '#FFE3D6', tabs: ['outfit', 'top', 'bottom', 'palette', 'shoes', 'shoeColor'] },
  { name: 'Extras', color: '#C96B82', tint: '#FFE3EC', tabs: ['hat', 'accessory'] },
];
const labels: Record<string, string> = { presentation: 'Me', skinTone: 'Skin', hairStyle: 'Hair', hairColor: 'Hair colour', palette: 'Clothes colour', outfit: 'Outfit', top: 'Top', bottom: 'Bottom', hat: 'Hat', accessory: 'Extra', brows: 'Brows', lashes: 'Lashes', freckles: 'Freckles', cheeks: 'Cheeks', build: 'Build', shoes: 'Shoes', shoeColor: 'Shoe colour' };

/** Sunlit tropical dressing-room backdrop behind the Islander preview (uses only Rect/Circle/Path). */
function DressingRoomBackdrop() {
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}>
    <Svg width="100%" height="100%" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" accessible={false}>
      <Rect x={0} y={0} width={320} height={220} fill="#E6F5F1"/>
      <Circle cx={256} cy={46} r={42} fill="#FFF5D4"/>
      <Circle cx={256} cy={46} r={24} fill="#FFE39B"/>
      <Path d="M-8 164Q76 144 160 156Q244 168 328 150V224H-8Z" fill="#FFF3DC"/>
      <Path d="M-8 184Q88 170 164 178Q246 186 328 174V224H-8Z" fill="#FCE5BE"/>
      <Path d="M-6 28Q24 10 52 30Q24 28 -6 44ZM-4 54Q28 38 56 62Q26 58 -4 72ZM326 24Q294 8 268 30Q296 28 326 42ZM324 54Q292 42 266 66Q296 60 324 72Z" fill="#BFE2D4"/>
      <Path d="M114 196Q160 185 206 196Q160 207 114 196Z" fill="#E6CFA8"/>
    </Svg>
  </View>;
}

function TabPicture({ tab, color }: { tab: Tab; color: string }) {
  const line = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <Svg width={27} height={27} viewBox="0 0 32 32" accessible={false}>
    {(['presentation', 'skinTone', 'build'] as Tab[]).includes(tab) && <><Circle cx={16} cy={9} r={5} {...line}/><Path d="M7 27v-4c0-5 4-8 9-8s9 3 9 8v4" {...line}/></>}
    {(['hairStyle', 'hairColor', 'hat'] as Tab[]).includes(tab) && <><Path d="M7 16c-1-8 3-13 9-13s10 5 9 13l-2 9H9z" {...line}/><Path d="M10 17c4 0 7-3 9-5 2 3 4 4 6 4" {...line}/></>}
    {tab === 'hairColor' && <Path d="M12 8q-3 7 0 15m5-16q-3 7 0 16" {...line}/>}
    {(['brows', 'lashes', 'freckles', 'cheeks'] as Tab[]).includes(tab) && <><Path d="M4 13c4-4 8-4 11 0m2 0c4-4 8-4 11 0" {...line}/><Circle cx={10} cy={18} r={2} fill={color}/><Circle cx={22} cy={18} r={2} fill={color}/><Path d="M12 24q4 3 8 0" {...line}/></>}
    {(['outfit', 'top', 'bottom', 'palette'] as Tab[]).includes(tab) && <Path d="M11 4l5 3 5-3 7 6-4 5-3-2v15H11V13l-3 2-4-5z" {...line}/>}
    {(['shoes', 'shoeColor'] as string[]).includes(tab) && <><Path d="M5 20h7l5 4h9v4H5z" {...line}/><Path d="M5 20v-6" {...line}/></>}
    {(['hairColor', 'palette', 'shoeColor'] as Tab[]).includes(tab) && <Path d="M25 3c-1 3-4 5-4 8a4 4 0 0 0 8 0c0-3-3-5-4-8z" fill={color}/>}
    {tab === 'accessory' && <><Rect x={3} y={12} width={11} height={9} rx={4} {...line}/><Rect x={18} y={12} width={11} height={9} rx={4} {...line}/><Path d="M14 15q2-2 4 0" {...line}/></>}
  </Svg>;
}

export function StyleEditor({ look, equipped, earned, unseen, onChange, onSeen, initialTab = 'presentation', initialItem, creator = false, onBadges }: {
  look: IslanderLook; equipped: IslanderLook; earned: string[]; unseen: string[];
  onChange: (look: IslanderLook, item?: StyleItem) => void; onSeen?: (id: string) => void;
  initialTab?: Tab; initialItem?: StyleItem; creator?: boolean; onBadges?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height && height < 550;
  const side = width >= 700 || landscape;
  const [tab, setTab] = useState<Tab>(initialTab);
  const tabScroll = useRef<ScrollView>(null), gridScroll = useRef<ScrollView>(null);
  const [back, setBack] = useState(false);
  const [detail, setDetail] = useState<StyleItem | undefined>(initialItem);
  const reason = detail && lockedReason(detail, earned);
  const visibleGroups = useMemo(() => groups.map(g => ({ ...g, tabs: g.tabs.filter(t => t === 'presentation' || styleCatalog.some(i => i.category === t)) })).filter(g => g.tabs.length), []);
  useEffect(() => {
    let x = 0;
    for (const group of visibleGroups) {
      const index = group.tabs.indexOf(tab);
      if (index >= 0) { x += index * 67; break; }
      x += group.tabs.length * 67 + 11;
    }
    const timer = setTimeout(() => tabScroll.current?.scrollTo({ x: Math.max(0, x - Math.min(width, 650) / 3), animated: false }), 0);
    return () => clearTimeout(timer);
  }, [tab, width, visibleGroups]);
  const currentGroup = visibleGroups.find(g => g.tabs.includes(tab)) ?? visibleGroups[0];
  const snapOffsets = useMemo(() => visibleGroups.flatMap((group, groupIndex) => {
    const start = visibleGroups.slice(0, groupIndex).reduce((sum, previous) => sum + previous.tabs.length * 67 + 11, 0);
    return group.tabs.map((_, index) => start + index * 67);
  }), [visibleGroups]);
  const [room, setRoom] = useState(0), [tabsHeight, setTabsHeight] = useState(0), [gridHeight, setGridHeight] = useState(0), [ruleHeight, setRuleHeight] = useState(0);
  const { previewSize, pinned } = editorLayout({ room, tabs: tabsHeight, side, landscape, height });
  const tight = landscape || (!!room && room < 420);
  const preview = <View testID="style-preview" style={{ minHeight: previewSize + 24, flexShrink: 0, borderRadius: 28, backgroundColor: '#FFF8EC', borderWidth: 1.5, borderColor: '#EFE0C6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingVertical: 12 }}>
    <DressingRoomBackdrop/>
    <View style={{ position: 'relative', zIndex: 1 }}>
      <Islander view={back ? 'back' : 'front'} pose={back ? 0 : 'idle'} look={look} size={previewSize}/>
    </View>
    <PressableScale accessibilityRole="button" accessibilityLabel={back ? 'See the front' : 'See the back'} onPress={() => setBack(!back)} style={{ position: 'absolute', right: 10, top: 10, zIndex: 2, width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFDF8', borderWidth: 1.5, borderColor: '#EADBC2', alignItems: 'center', justifyContent: 'center' }}><Icon name="refresh"/></PressableScale>
    {!!onBadges && <PressableScale accessibilityRole="button" accessibilityLabel="My badges" onPress={onBadges} style={{ position: 'absolute', right: 10, bottom: 10, zIndex: 2, paddingHorizontal: 14, minHeight: 44, borderRadius: 22, backgroundColor: '#FFFDF8', borderWidth: 1.5, borderColor: '#EADBC2', justifyContent: 'center' }}><Copy maxFontSizeMultiplier={1.3} style={{ color: C.ink, fontSize: 13, fontWeight: '700' }}>My badges</Copy></PressableScale>}
  </View>;
  const tabs = <View testID="style-tabs" onLayout={e => setTabsHeight(e.nativeEvent.layout.height)} style={{ borderRadius: 24, backgroundColor: '#FFF8EC', borderWidth: 1.5, borderColor: '#EFE0C6', paddingVertical: tight ? 4 : 8 }}>{!tight && <View accessibilityLiveRegion="polite" style={{ alignSelf: 'flex-start', marginLeft: 12, marginBottom: 5, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, backgroundColor: currentGroup.tint }}><Copy maxFontSizeMultiplier={1.2} style={{ color: C.ink, fontSize: 12, lineHeight: 16, fontWeight: '700' }}>{currentGroup.name}</Copy></View>}<ScrollView ref={tabScroll} horizontal snapToOffsets={snapOffsets} decelerationRate="fast" style={Platform.OS === 'web' ? { scrollSnapType: 'x mandatory' } as ViewStyle : undefined} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 8 }}>
    {visibleGroups.map(group => <View key={group.name} style={{ flexDirection: 'row', gap: 3, padding: 4, borderRadius: 20, backgroundColor: group.tint, alignItems: 'center' }}>{group.tabs.map(t => {
      const active = tab === t;
      return <PressableScale key={t} accessibilityRole="tab" accessibilityLabel={`${group.name}, ${labels[t]}`} accessibilityState={{ selected: active }} onPress={() => { setTab(t); setDetail(undefined); gridScroll.current?.scrollTo({ y: 0, animated: false }); }} style={{ ...(Platform.OS === 'web' ? { scrollSnapAlign: 'start' } as ViewStyle : {}), width: 64, minHeight: tight ? 60 : 76, borderRadius: 17, backgroundColor: active ? group.color : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 1, borderWidth: active ? 2.5 : 0, borderColor: '#FF7A5C' }}><TabPicture tab={t} color={active ? '#FFFFFF' : C.ink}/><Copy maxFontSizeMultiplier={1.3} style={{ color: active ? '#FFFFFF' : C.ink, fontSize: 11, lineHeight: 15, fontWeight: '700', textAlign: 'center' }}>{labels[t].replace(' colour', '\ncolour')}</Copy></PressableScale>;
    })}</View>)}
  </ScrollView></View>;
  const choices = <View style={{ gap: 10 }}>
    {!(creator && landscape && tab === 'presentation') && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 7, height: 29, borderRadius: 4, backgroundColor: currentGroup.color }}/><Heading style={{ fontSize: 22 }}>{tab === 'presentation' ? "Who's your islander?" : categories.find(c => c.key === tab)?.label ?? labels[tab]}</Heading></View>}
    {creator && !landscape && !!look.presentation && <Copy style={{ fontSize: 14 }}>Tap the pictures below to style your islander.</Copy>}
    {tab === 'presentation' ? <><View style={{ flexDirection: 'row', gap: 8 }}>{(['boy', 'girl', 'me'] as const).map(value => {
      const chosen = look.presentation === value;
      const candidate = { ...look, ...presentationPresets[value] } as IslanderLook;
      return <PressableScale key={value} accessibilityRole="button" accessibilityLabel={value === 'me' ? 'Just me' : value === 'boy' ? 'Boy' : 'Girl'} accessibilityState={{ selected: chosen }} onPress={() => onChange(candidate)} style={{ flex: 1, minWidth: 0, minHeight: landscape ? 84 : 132, alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 24, borderWidth: chosen ? 3 : 1.5, borderColor: chosen ? '#FF7A5C' : '#EFE0C6', backgroundColor: chosen ? '#FFF1E8' : '#FFFDF8' }}><Islander look={candidate} size={landscape ? 48 : 79}/><Copy style={{ fontWeight: '700', fontSize: 14, lineHeight: 18, color: C.ink, textAlign: 'center', marginTop: 2 }}>{value === 'me' ? 'Just me' : value === 'boy' ? 'Boy' : 'Girl'}</Copy></PressableScale>;
    })}</View>{!landscape && <Copy style={{ fontSize: 13 }}>Anyone can wear anything.</Copy>}</> : <>{styleCatalog.some(i => i.category === tab && i.audience) && <Copy style={{ fontSize: 13 }}>Anyone can wear anything.</Copy>}<StyleGrid compact={landscape} category={tab as Category} look={look} equipped={equipped} earned={earned} unseen={unseen} onChoose={item => { onChange(lookWithStyle(look, item), item); setDetail(item); onSeen?.(item.id); }}/ ></>}
  </View>;
  // The explanation lives in the scroller, so however much room it takes, another item is one scroll away.
  // It stays in view while it's short; a long one scrolls with the items, and the scroller starts at it.
  const stickyRule = pinned && !!reason && !!ruleHeight && !!gridHeight && ruleHeight <= gridHeight * .45;
  const rule = !!reason && <View testID="style-lock-rule" onLayout={e => {
    const { height: tall, y } = e.nativeEvent.layout;
    setRuleHeight(tall);
    if (!pinned || !gridHeight || tall > gridHeight * .45) gridScroll.current?.scrollTo({ y: Math.max(0, y - 4), animated: false });
  }} style={{ paddingBottom: 8, backgroundColor: pinned ? C.cream : undefined }}><LockRule>{reason}</LockRule></View>;
  const scroller = (content: React.ReactNode, sticky?: number[]) => <ScrollView ref={gridScroll} testID="style-scroll" onLayout={e => setGridHeight(e.nativeEvent.layout.height)} style={{ flex: 1, minHeight: pinned ? MIN_GRID : 0 }} nestedScrollEnabled stickyHeaderIndices={sticky} contentContainerStyle={{ paddingBottom: 12, gap: pinned ? 0 : 8 }}>{content}</ScrollView>;
  const layoutProps = { testID: 'style-editor', onLayout: (e: LayoutChangeEvent) => setRoom(e.nativeEvent.layout.height) };
  if (!pinned) return <View {...layoutProps} style={{ flex: 1, minHeight: 0, width: '100%' }}>{scroller(<>{preview}{tabs}{rule}{choices}</>)}</View>;
  const grid = scroller([<React.Fragment key="rule">{rule}</React.Fragment>, <React.Fragment key="choices">{choices}</React.Fragment>], stickyRule ? [0] : undefined);
  // One layout for Creator and Locker: only the grid scrolls, so the preview and its buttons stay in view.
  if (side) return <View {...layoutProps} style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 12, width: '100%', maxWidth: 1100, alignSelf: 'center' }}>
    <View style={{ width: '39%', gap: 8 }}>{preview}{creator && landscape ? <Copy style={{ fontSize: 12, lineHeight: 16 }}>Tap the pictures to style your islander.</Copy> : null}</View>
    <View style={{ flex: 1, minHeight: 0, gap: 8 }}>{tabs}{grid}</View>
  </View>;
  return <View {...layoutProps} style={{ flex: 1, minHeight: 0, gap: 8, width: '100%' }}>
    {preview}{tabs}
    {grid}
  </View>;
}
