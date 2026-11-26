import React from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { DifficultyPills, Icon, PressTarget, Text, glyphs, theme } from '../ui';
import type { DifficultyOption } from '../ui';

export type Cell = { key: string; number: number; finished: boolean; readAlong?: boolean; onPress: () => void };
export type Filter = 'all' | 'finished' | 'mixed';
const CELL = 64, GAP = 8, GUTTER = 16;

/** A small choice chip (bank or filter), 48 pt. */
export function Chip({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  return <PressTarget role="radio" checked={selected} testID={testID} accessibilityLabel={label} onPress={onPress} style={[styles.chip, { backgroundColor: selected ? theme.colors.lagoon : theme.colors.lagoonSoft }]}>
    <Text variant="caption" tone={selected ? 'surface' : 'ink'} style={styles.bold}>{label}</Text>
  </PressTarget>;
}

/**
 * Choose a puzzle: the difficulty pills, an optional set row, a small filter, then one numbered grid with ticks on
 * finished puzzles. Hidden puzzles never reach the grid. It fills the large sheet the Puzzles screen opens it in, which
 * owns its title, Close, swipe, Escape and focus.
 */
export function ChooseGrid({ options, tier, onTier, sets, filters, filter, onFilter, cells, empty, status }: {
  options: readonly DifficultyOption[];
  tier: number;
  onTier: (tier: number) => void;
  /** Banks within this difficulty, when there is more than one. */
  sets?: readonly { key: string; label: string; selected: boolean; onPress: () => void }[];
  filters: readonly { value: Filter; label: string }[];
  filter: Filter;
  onFilter: (filter: Filter) => void;
  cells: readonly Cell[];
  empty: string;
  status?: string;
}) {
  const { width } = useWindowDimensions(), room = Math.min(width, 960) - 2 * GUTTER, columns = Math.max(3, Math.floor((room + GAP) / (CELL + GAP)));
  const header = <View style={styles.header}>
    {options.length > 1 && <DifficultyPills options={options} value={tier} onChange={key => onTier(Number(key))}/>}
    {!!sets && sets.length > 1 && <View accessibilityRole="radiogroup" accessibilityLabel="Set" style={styles.chips}>{sets.map(s => <Chip key={s.key} testID={`set-${s.key}`} label={s.label} selected={s.selected} onPress={s.onPress}/>)}</View>}
    {filters.length > 1 && <View accessibilityRole="radiogroup" accessibilityLabel="Show" style={styles.chips}>{filters.map(f => <Chip key={f.value} testID={`filter-${f.value}`} label={f.label} selected={filter === f.value} onPress={() => onFilter(f.value)}/>)}</View>}
    {!!status && <Text variant="caption" accessibilityLiveRegion="polite">{status}</Text>}
  </View>;
  return <View testID="choose-grid" style={styles.screen}>
    <FlatList key={columns} style={styles.list} contentContainerStyle={styles.content} columnWrapperStyle={styles.row} numColumns={columns} data={cells as Cell[]} keyExtractor={c => c.key}
      initialNumToRender={36} maxToRenderPerBatch={36} windowSize={5} ListHeaderComponent={header}
      ListEmptyComponent={<Text variant="body" tone="muted">{empty}</Text>}
      renderItem={({ item }) => <PressTarget target="child" testID={`puzzle-${item.number}`} accessibilityLabel={[`Puzzle ${item.number}`, item.finished && 'finished', item.readAlong && 'read along together'].filter(Boolean).join(', ')} onPress={item.onPress} style={[styles.cell, item.finished && styles.done]}>
        <Text variant="body" style={styles.bold}>{item.number}</Text>
        {item.finished && <View style={styles.tick}><Icon glyph={glyphs.Check} size={14} tone="surface"/></View>}
        {item.readAlong && <View style={styles.read}><Icon glyph={glyphs.BookOpen} size={14} tone="muted"/></View>}
      </PressTarget>}/>
  </View>;
}

/** Plain style objects (React Native accepts them as they are). */
const styles = {
  screen: { flex: 1 },
  list: { flex: 1 },
  content: { width: '100%', maxWidth: 960, alignSelf: 'center', paddingHorizontal: GUTTER, paddingBottom: theme.space.xxl, gap: GAP },
  header: { gap: theme.space.md, paddingBottom: theme.space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  chip: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.space.lg, borderRadius: theme.radius.full },
  bold: { fontWeight: '800' },
  row: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: theme.radius.tile - 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  done: { backgroundColor: theme.colors.successSoft },
  tick: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: theme.radius.full, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center' },
  read: { position: 'absolute', bottom: 4, right: 4 },
} as const;
