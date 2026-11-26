import React from 'react';
import { View } from 'react-native';
import type { ChallengeEntry } from '../challenge/types';
import type { ChallengeSession } from '../state/challenge';
import { Button, DifficultyPills, Icon, IconButton, PressTarget, Sheet, Text, glyphs, theme } from '../ui';
import { infoFor } from './catalog';
import { CoveMotif, hasTileArt } from './CoveArt';
import { FaceButton } from './PeoplePicker';
import { difficultyOptionsFor, pastelFor } from './shelf';

type Person = { id: string; name: string };
/** A mode chip: icon and a short word, one radio stop each. */
function ModeChip({ glyph, label, selected, onPress }: { glyph: typeof glyphs.User; label: string; selected: boolean; onPress: () => void }) {
  return <PressTarget target="child" haptic role="radio" checked={selected} testID={`mode-${label}`} accessibilityLabel={label} onPress={onPress} style={[styles.chip, { backgroundColor: selected ? theme.colors.lagoon : theme.colors.lagoonSoft }]}>
    <Icon glyph={glyph} tone={selected ? 'surface' : 'ink'}/>
    <Text variant="body" tone={selected ? 'surface' : 'ink'} style={styles.word}>{label}</Text>
  </PressTarget>;
}

/**
 * A game's start sheet: its picture and name, the difficulties it has, its modes, a favorite star and one coral
 * action. A paused puzzle makes that action Continue, shown with its own saved difficulty and partner; the pills and
 * modes under it are labelled as the choices for a quiet New puzzle, which is all they change. Opening, refusal and
 * "nothing left here" feedback shows in the sheet that owns the action.
 */
export function StartSheet({ entry, visible, tier, onTier, saved, savedLabel, partners, partner, onPartner, favorite, onFavorite, busy, status, onChoose, onPlay, onContinue, onNew, onClose }: {
  entry: ChallengeEntry;
  visible: boolean;
  tier: number;
  onTier: (tier: number) => void;
  /** This person's paused attempt in the game. */
  saved?: ChallengeSession;
  /** The paused attempt's own difficulty and who it is with (`Hard 9×9 · with Mele`), shown on Continue. */
  savedLabel?: string;
  /** People who could play together with this person. */
  partners: readonly Person[];
  partner: string | null;
  onPartner: (id: string | null) => void;
  favorite: boolean;
  onFavorite: () => void;
  busy?: boolean;
  /** A calm live line: opening, could not open, or nothing left here. */
  status?: string;
  /** Offered with "No other puzzle here": open Choose a puzzle for this game. */
  onChoose?: () => void;
  onPlay: () => void;
  onContinue: () => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const name = infoFor(entry.game).name, options = difficultyOptionsFor(entry), together = partner !== null;
  return <Sheet visible={visible} title={name} onClose={onClose}>
    <View style={styles.top}>
      <View style={[styles.picture, { backgroundColor: theme.pastels[pastelFor(entry.game)] }]}><CoveMotif game={entry.game} size={hasTileArt(entry.game) ? 124 : 88}/></View>
      <IconButton testID="start-favorite" glyph={glyphs.Star} filled={favorite} accessibilityLabel={favorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`} onPress={onFavorite} style={styles.star}/>
    </View>
    {saved && <View style={styles.saved}>
      <Button testID="start-continue" label="Continue" accessibilityLabel={savedLabel ? `Continue, ${savedLabel}` : 'Continue'} fill disabled={busy} onPress={onContinue}/>
      {!!savedLabel && <Text testID="start-saved" variant="caption" tone="muted" style={styles.center}>{savedLabel}</Text>}
    </View>}
    {saved && <Text testID="start-new-heading" variant="small" tone="muted" accessibilityRole="header">For a new puzzle</Text>}
    {options.length > 0 && <DifficultyPills options={options} value={tier} onChange={key => onTier(Number(key))}/>}
    {partners.length > 0 && <View accessibilityRole="radiogroup" accessibilityLabel="Who plays" style={styles.row}>
      <ModeChip glyph={glyphs.User} label="On my own" selected={!together} onPress={() => onPartner(null)}/>
      <ModeChip glyph={glyphs.UsersThree} label="Play together" selected={together} onPress={() => { if (!together) onPartner(partners[0].id); }}/>
    </View>}
    {together && <View style={styles.row}>{partners.map(p => <FaceButton key={p.id} id={p.id} name={p.name} label={`Play together with ${p.name}`} selected={partner === p.id} onPress={() => onPartner(p.id)}/>)}</View>}
    {saved ? <Button testID="start-new" label="New puzzle" variant="quiet" target="adult" fill disabled={busy} onPress={onNew}/>
      : <Button testID="start-play" label="Play" fill disabled={busy} onPress={onPlay}/>}
    {!!status && <Text testID="start-status" variant="caption" accessibilityLiveRegion="polite" style={styles.center}>{status}</Text>}
    {onChoose && <Button testID="start-choose" label="Choose a puzzle" variant="secondary" target="adult" fill onPress={onChoose}/>}
  </Sheet>;
}

/** Plain style objects (React Native accepts them as they are). */
const styles = {
  top: { alignItems: 'center' },
  picture: { width: 160, height: 160, borderRadius: theme.radius.tile, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: theme.colors.rim },
  star: { position: 'absolute', top: 0, right: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, paddingHorizontal: theme.space.lg, borderRadius: theme.radius.full },
  word: { fontWeight: '800' },
  saved: { gap: theme.space.xs },
  center: { textAlign: 'center' },
} as const;
