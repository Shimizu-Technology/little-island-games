import { C as BaseC, Heading as BaseHeading, Copy as BaseCopy , PressableScale } from "../components/ui";
import { useNunitoLoaded } from "../ui/fonts";

import React from 'react';
import { View } from 'react-native';
import { BadgeArt } from './BadgeArt';
import { tracks, progressFor, progressForBadge, badgeInfo, type BadgeId } from './engine';
export const trackLabels = { math: 'Math', reading: 'Reading', science: 'Science & Thinking', coding: 'Coding', chamoru: 'CHamoru words', arcade: 'Arcade', classic: 'Classic & Board' };
/** All frames stay present, so earning adds colour without moving a child's collection. */
export function BadgeWall({ badges, milestones, selected, onSelect }: { badges: readonly BadgeId[]; milestones: string[]; selected?: BadgeId; onSelect: (id: BadgeId) => void }) {
  return <View testID="badge-wall" style={{ gap: 16 }}>{tracks.map(track => <View key={track} style={{ gap: 10, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper }}>
    <Heading style={{ fontSize: 21 }}>{trackLabels[track]}</Heading>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{([1,2,3,4] as const).map(tier => {
      const id: BadgeId = `${track}-${tier}`, info = badgeInfo(id), earned = badges.includes(id);
      return <PressableScale key={id} testID={`badge-${id}`} accessibilityRole="button" accessibilityLabel={`${info.name}. ${earned ? 'Earned' : 'Not earned yet'}. ${info.rule}`} accessibilityState={{ selected: selected === id }} onPress={() => onSelect(id)} style={{ flexBasis: '45%', flexGrow: 1, minHeight: 130, paddingVertical: 8, alignItems: 'center', borderRadius: 14, backgroundColor: selected === id ? C.soft : C.cream, borderWidth: 2, borderColor: selected === id ? C.teal : 'transparent', gap: 5 }}>
        <BadgeArt id={id} earned={earned} size={58}/><Copy style={{ textAlign: 'center', fontSize: 15, lineHeight: 21, paddingHorizontal: 2 }}>{info.name}</Copy>
      </PressableScale>;
    })}</View>
    {selected?.startsWith(`${track}-`) && <View accessibilityLiveRegion="polite" style={{ gap: 4, padding: 12, borderRadius: 12, backgroundColor: C.soft }}><Heading style={{ fontSize: 18 }}>{badgeInfo(selected).name}</Heading><Copy style={{ fontSize: 14 }}>{badgeInfo(selected).rule}</Copy><Copy style={{ fontSize: 13, color: C.muted }}>{badges.includes(selected) ? 'Earned · Always yours' : progressForBadge(selected, milestones)}</Copy></View>}
    <Copy style={{ fontSize: 14, color: C.muted }}>Next: {progressFor(track, milestones)}</Copy>
  </View>)}</View>;
}

const C = { ...BaseC, cream: '#FFF6E5', paper: '#FFFDF8', line: '#E8D8BE', ink: '#3D2B24', muted: '#665247', teal: '#9A641A', soft: '#FFF0D2', coral: '#FF7A5C' };
function Heading(props: React.ComponentProps<typeof BaseHeading>) {
 const loaded = useNunitoLoaded();
 return <BaseHeading {...props} style={[{ color: '#3D2B24' }, props.style, loaded ? {fontFamily: 'Nunito_800ExtraBold', fontWeight: 'normal'} : {fontWeight: '800'}]}/>;
}
function Copy(props: React.ComponentProps<typeof BaseCopy>) {
 const loaded = useNunitoLoaded();
 return <BaseCopy {...props} style={[{ color: '#665247' }, loaded && {fontFamily: 'Nunito_600SemiBold', fontWeight: 'normal'}, props.style]}/>;
}
