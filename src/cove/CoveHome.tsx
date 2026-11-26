import React, { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Icon, PageHeader, PressTarget, Sheet, Text, Tile, theme } from '../ui';
import type { Pastel } from '../ui/theme';
import { SECTION_ICON, TodayArt, tileArt } from './CoveArt';
import { Face, PeoplePicker } from './PeoplePicker';
import type { ShelfSection, ShelfTile } from './shelf';
import { TITLE_MAX, atLarge, sharedWordFit } from '../components/wordFit';

export type ContinueItem = { key: string; game: string; name: string; pastel: Pastel; from?: { id: string; name: string }; onPress: () => void; onLongPress?: () => void };
const MAX_WIDTH = 960, GUTTER = 16, GAP = 12;
/** The strip shows this many cards; more open from "See all", so no paused puzzle or pin is ever out of reach. */
export const STRIP = 4;
/** Two columns on phones, three on small tablets, four on wide windows. */
export const columnsFor = (width: number) => width >= 900 ? 4 : width >= 600 ? 3 : 2;
export const tileWidth = (width: number) => { const columns = columnsFor(width), room = Math.min(width, MAX_WIDTH) - 2 * GUTTER; return Math.floor((room - (columns - 1) * GAP) / columns); };

/**
 * Puzzles home: header, Continue strip (paused puzzles and family pins), Favorites, then Today and the shelf
 * sections as picture tiles. No counts, no band words, no buttons on tiles: tap opens, long-press favorites.
 */
export function CoveHome({ sections, continueItems, favorites, isFavorite, onBack, onTile, onFavorite, onToday, status }: {
  sections: readonly ShelfSection[];
  continueItems: readonly ContinueItem[];
  favorites: readonly (ShelfTile & { pastel: Pastel })[];
  isFavorite: (id: string) => boolean;
  onBack: () => void;
  onTile: (tile: ShelfTile) => void;
  onFavorite: (id: string) => void;
  onToday?: () => void;
  /** A calm one-line status (opening, could not open). */
  status?: React.ReactNode;
}) {
  const { width, fontScale } = useWindowDimensions(), size = tileWidth(width), [all, setAll] = useState(false);
  // At accessibility sizes every tile name shares one size at which its longest word still fits the tile.
  const nameMax = atLarge(fontScale, sharedWordFit([...sections.flatMap(s => s.tiles), ...favorites].map(t => t.name).concat('Today'), theme.type.caption.fontSize, size, TITLE_MAX));
  const tile = (t: ShelfTile, pastel: Pastel, key = t.id) => <View key={key} style={{ width: size }}>
    <Tile testID={`cove-tile-${t.id}`} name={t.name} nameMax={nameMax} pastel={pastel} art={tileArt(t.id, size)} favorite={isFavorite(t.id)} onPress={() => onTile(t)} onLongPress={() => onFavorite(t.id)}/>
  </View>;
  return <View style={styles.screen}>
    <View style={styles.bar}><PageHeader title="Puzzles" onBack={onBack} backLabel="Back to map" right={<PeoplePicker/>}/></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {status}
      {continueItems.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} testID="cove-continue">
        {continueItems.slice(0, STRIP).map(item => <ContinueCard key={item.key} item={item}/>)}
        {continueItems.length > STRIP && <PressTarget testID="cove-continue-all" accessibilityLabel={`See all ${continueItems.length} paused puzzles and pins`} onPress={() => setAll(true)} style={[styles.more, theme.shadow]}>
          <Text variant="caption" style={styles.cardName}>See all ({continueItems.length})</Text>
        </PressTarget>}
      </ScrollView>}
      {favorites.length > 0 && <Section icon={<Icon glyph={SECTION_ICON.favorites} weight="fill"/>} title="Favorites">{favorites.map(t => tile(t, t.pastel, `favorite-${t.id}`))}</Section>}
      {onToday && <View style={styles.grid}><View style={{ width: size }}><Tile testID="cove-today" name="Today" nameMax={nameMax} pastel="puzzles" art={<TodayArt size={Math.max(40, Math.min(96, Math.round(size * 0.5)))}/>} onPress={onToday}/></View></View>}
      {sections.map(s => <Section key={s.id} icon={<Icon glyph={SECTION_ICON[s.id]}/>} title={s.title}>{s.tiles.map(t => tile(t, s.pastel))}</Section>)}
    </ScrollView>
    <Sheet visible={all} title="Continue" onClose={() => setAll(false)}>
      <View testID="cove-continue-list" style={styles.list}>{continueItems.map(item => <ContinueCard key={item.key} item={{ ...item, onPress: () => { setAll(false); item.onPress(); }, onLongPress: item.onLongPress && (() => { setAll(false); item.onLongPress!(); }) }} wide/>)}</View>
    </Sheet>
  </View>;
}
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <View style={styles.section}>
    <View style={styles.heading}>{icon}<Text variant="section" accessibilityRole="header">{title}</Text></View>
    <View style={styles.grid}>{children}</View>
  </View>;
}
/** One Continue card: the game's picture, "Continue · Sudoku", and the sender's face on a pin. */
function ContinueCard({ item, wide = false }: { item: ContinueItem; wide?: boolean }) {
  const label = item.from ? `${item.name}, from ${item.from.name}` : `Continue · ${item.name}`;
  return <PressTarget target="child" haptic testID={`cove-continue-${item.key}`} accessibilityLabel={label} onPress={item.onPress} onLongPress={item.onLongPress}
    accessibilityActions={item.onLongPress ? [{ name: 'longpress', label: 'Put away' }] : undefined} onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'longpress') item.onLongPress?.(); }}
    style={[styles.card, wide && styles.wide, theme.shadow]}>
    <View style={[styles.cardArt, { backgroundColor: theme.pastels[item.pastel] }]}>{tileArt(item.game, 72)}</View>
    <View style={styles.cardWords}>
      <Text variant="small" tone="muted" numberOfLines={1}>{item.from ? 'From' : 'Continue'}</Text>
      <Text variant="caption" numberOfLines={1} style={styles.cardName}>{item.name}</Text>
    </View>
    {item.from && <Face id={item.from.id} name={item.from.name} size={32}/>}
  </PressTarget>;
}

/** Plain style objects (React Native accepts them as they are). */
const styles = {
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  bar: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  content: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: GUTTER, paddingBottom: theme.space.xxl, gap: theme.space.xl },
  strip: { gap: GAP, paddingVertical: theme.space.xs },
  card: { width: 220, flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, padding: theme.space.sm, borderRadius: theme.radius.tile, backgroundColor: theme.colors.surface },
  wide: { width: '100%' },
  more: { minWidth: 120, alignItems: 'center', justifyContent: 'center', padding: theme.space.md, borderRadius: theme.radius.tile, backgroundColor: theme.colors.surface },
  list: { gap: theme.space.sm },
  cardArt: { width: 56, height: 56, borderRadius: theme.radius.tile - 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardWords: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: '800' },
  section: { gap: theme.space.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
} as const;
