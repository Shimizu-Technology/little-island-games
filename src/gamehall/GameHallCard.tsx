import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { GameIcon } from '../components/GameIcon';
import { Text, TextFit, entryRegion } from '../components/Text';
import { Copy, IconButton, PressableScale } from '../components/ui';
import type { ShelfId } from '../learn/home';
import { theme } from '../ui/theme';
import type { WordGame } from '../wordgames/session';

export type GameHallCardId = ShelfId | WordGame;

export const HALL_BG = '#FFF6E5';
export const HALL_PAPER = '#FFFDF8';
export const HALL_BORDER = '#E4D5BF';
export const HALL_INK = theme.colors.frame;
export const HALL_MUTED = '#5E4B3E';
export const HALL_CORAL = theme.colors.coral;
export const HALL_LAGOON = theme.colors.lagoon;
export const HALL_PILL_BG = '#F6EDDC';
export const HALL_CARD_SHADOW = '0 4px 0 rgba(61, 43, 36, 0.11), 0 8px 18px rgba(61, 43, 36, 0.08)';

export function GameHallCard({
  id,
  name,
  description,
  surface,
  playerPill,
  live,
  favorite,
  width,
  testID,
  accessibilityLabel,
  nunitoLoaded = false,
  onPress,
  onToggleFavorite,
}: {
  id: GameHallCardId;
  name: string;
  description: string;
  surface: string;
  playerPill: string;
  live: boolean;
  favorite: boolean;
  width: number;
  testID?: string;
  accessibilityLabel: string;
  nunitoLoaded?: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const bold = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily['800'], fontWeight: 'normal' } as const)
    : ({ fontWeight: '800' } as const);
  const compact = width < 210;
  const artBannerHeight = compact ? 104 : 118;
  const artSize = compact ? 86 : 98;
  const region = entryRegion(fontScale, Math.max(120, width - 28));

  return (
    <TextFit.Provider value={region}>
      <View
        style={{
          width,
          borderRadius: 24,
          overflow: 'hidden',
          backgroundColor: HALL_PAPER,
          borderWidth: 1.5,
          borderColor: HALL_BORDER,
          borderBottomWidth: 3.5,
          borderBottomColor: 'rgba(61, 43, 36, 0.16)',
          boxShadow: HALL_CARD_SHADOW,
        }}
      >
        <PressableScale
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={onPress}
          amount={0.98}
          style={{ flex: 1 }}
        >
          <View
            style={{
              height: artBannerHeight,
              backgroundColor: surface,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              paddingHorizontal: 10,
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: -24,
                width: width * 1.2,
                height: 44,
                borderRadius: width,
                backgroundColor: 'rgba(255, 253, 248, 0.45)',
              }}
            />
            <View style={{ zIndex: 1 }}>
              <GameIcon id={id} size={artSize} bare />
            </View>
            {live && (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  backgroundColor: HALL_LAGOON,
                  borderRadius: 999,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  zIndex: 2,
                }}
              >
                <Text style={{ color: HALL_PAPER, fontSize: 12, ...bold }}>Saved</Text>
              </View>
            )}
          </View>

          <View style={{ padding: compact ? 12 : 14, gap: 6, flex: 1 }}>
            <Text style={{ fontSize: compact ? 18 : 20, lineHeight: compact ? 23 : 25, color: HALL_INK, ...bold }}>
              {name}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <View
                style={{
                  backgroundColor: HALL_PILL_BG,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#E6D6BC',
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 12, color: HALL_MUTED, fontWeight: '700' }}>{playerPill}</Text>
              </View>
            </View>
            <Copy style={{ fontSize: 13, lineHeight: 18, color: HALL_MUTED }}>{description}</Copy>
            <View
              style={{
                marginTop: 'auto',
                paddingTop: 6,
              }}
            >
              <View
                style={{
                  backgroundColor: live ? HALL_LAGOON : HALL_CORAL,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderBottomWidth: 3,
                  borderColor: live ? '#144F4B' : '#D95D42',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  minHeight: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: live ? HALL_PAPER : HALL_INK, fontSize: 14, ...bold }}>
                  {live ? 'Continue →' : 'Play →'}
                </Text>
              </View>
            </View>
          </View>
        </PressableScale>
        <View style={{ position: 'absolute', top: 6, right: 6, zIndex: 3 }}>
          <IconButton
            icon={favorite ? 'star-filled' : 'star'}
            selected={favorite}
            size={44}
            label={`${favorite ? 'Remove favorite' : 'Favorite'} ${name}`}
            onPress={onToggleFavorite}
          />
        </View>
      </View>
    </TextFit.Provider>
  );
}
