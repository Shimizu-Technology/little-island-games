import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Copy } from '../components/ui';
const LOCK_INK = '#3B2418';
export function LockIcon() { return <Svg width={16} height={18} viewBox="0 0 24 24" accessible={false}><Path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke={LOCK_INK} strokeWidth={2.4} strokeLinecap="round"/><Rect x={5} y={10} width={14} height={11} rx={3.5} fill="#F5C458" stroke={LOCK_INK} strokeWidth={2}/></Svg>; }
export function LockBadge() { return <View pointerEvents="none" style={{ position: 'absolute', top: 6, right: 6, padding: 4, backgroundColor: '#FFF8EC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5CFA8' }}><LockIcon/></View>; }
export function LockRule({ children }: { children: string }) { return <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: '#FFF4D6', borderWidth: 1.5, borderColor: '#E4B76A' }}><LockIcon/><Copy style={{ flex: 1, color: '#2F1F18', fontSize: 14, lineHeight: 20 }}>{children}</Copy></View>; }
