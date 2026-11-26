/**
 * A host-element stand-in for `src/ui` in Puzzles (Cove) tests that mock React Native down to a few strings. Each kit
 * component becomes a plain element that keeps the props the Cove tests read: labels, press handlers, test IDs and
 * selection. The real kit is covered by tests/ui-kit.test.tsx. Use: `vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui)`.
 */
import React from 'react';
import { theme } from '../../src/ui/theme';

/** A host element with React Native props (`onPress`, `testID`, …), which DOM JSX typing would refuse. */
const h = (type: string, props: Record<string, unknown> | null, ...children: React.ReactNode[]) => React.createElement(type as unknown as React.FC<Record<string, unknown>>, props, ...children);
type Press = { onPress?: () => void; onLongPress?: () => void; disabled?: boolean; testID?: string; accessibilityLabel?: string };
const DIFFICULTY_WORDS = ['Easy', 'Medium', 'Hard', 'Expert', 'Master', 'Master+'] as const;
const button = (p: Press & { children?: React.ReactNode; selected?: boolean; checked?: boolean }) => h('button', { onPress: p.disabled ? undefined : p.onPress, onLongPress: p.onLongPress, disabled: p.disabled, testID: p.testID, accessibilityLabel: p.accessibilityLabel, 'aria-selected': p.selected, 'aria-checked': p.checked }, p.children);
export const ui = {
  theme,
  DIFFICULTY_WORDS,
  difficultyOptions: (tags: readonly (string | undefined)[]) => tags.map((tag, i) => ({ key: i + 1, label: DIFFICULTY_WORDS[i], tag })),
  glyphs: new Proxy({}, { get: (_, name) => String(name) }),
  sheetHeight: (height: number, mode: 'dim' | 'small') => Math.floor(height * (mode === 'dim' ? theme.sheet.start : theme.sheet.small)),
  shouldDismiss: () => false,
  nativeFormSheetOptions: () => ({}),
  NunitoProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNunitoLoaded: () => false,
  targetFloor: () => 48,
  Text: ({ children, variant, tone, ...props }: { children?: React.ReactNode; variant?: string; tone?: string }) => <span data-variant={variant} data-tone={tone} {...props}>{children}</span>,
  Icon: ({ glyph }: { glyph: string }) => <i data-glyph={glyph}/>,
  Button: ({ label, accessibilityLabel, selected, ...p }: Press & { label: string; selected?: boolean }) => button({ ...p, selected, accessibilityLabel: accessibilityLabel ?? label, children: label }),
  IconButton: ({ glyph, filled, ...p }: Press & { glyph: string; filled?: boolean }) => h('button', { onPress: p.onPress, disabled: p.disabled, testID: p.testID, accessibilityLabel: p.accessibilityLabel, 'data-glyph': glyph, 'aria-pressed': filled }),
  PressTarget: ({ children, ...p }: Press & { children?: React.ReactNode; selected?: boolean; checked?: boolean }) => button({ ...p, children }),
  HoldButton: ({ label, onComplete }: { label: string; onComplete: () => void }) => button({ onPress: onComplete, accessibilityLabel: label, children: label }),
  Tile: ({ name, favorite, onPress, onLongPress, testID }: { name: string; favorite?: boolean; onPress?: () => void; onLongPress?: () => void; testID?: string }) => button({ onPress, onLongPress, testID, accessibilityLabel: favorite ? `${name}, favorite` : name, children: name }),
  ToggleRow: ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => h('switch', { accessibilityLabel: label, 'aria-checked': value, onPress: () => onChange(!value) }),
  ProfilePill: ({ label, onPress, avatar }: { label: string; onPress: () => void; avatar?: React.ReactNode }) => button({ onPress, testID: 'profile-pill', accessibilityLabel: label, children: avatar }),
  PageHeader: ({ title, onBack, backLabel, right }: { title: string; onBack: () => void; backLabel?: string; right?: React.ReactNode }) => <header>{button({ onPress: onBack, testID: 'page-back', accessibilityLabel: backLabel ?? 'Back' })}<h1>{title}</h1>{right}</header>,
  Hud: ({ title, subtitle, onBack, onUndo, onHint, onMore, backLabel = 'Back', canUndo = true, canHint = true, undoLabel = 'Undo', hintLabel = 'Hint' }: { title: string; subtitle?: string; onBack: () => void; onUndo?: () => void; onHint?: () => void; onMore?: () => void; backLabel?: string; canUndo?: boolean; canHint?: boolean; undoLabel?: string; hintLabel?: string }) => h('nav', { testID: 'hud', 'data-title': title, 'data-subtitle': subtitle },
    button({ onPress: onBack, testID: 'hud-back', accessibilityLabel: backLabel }), <b key="t">{title}</b>, !!subtitle && <small key="s">{subtitle}</small>,
    onUndo && button({ onPress: onUndo, disabled: !canUndo, testID: 'hud-undo', accessibilityLabel: undoLabel, children: undoLabel }),
    onHint && button({ onPress: onHint, disabled: !canHint, testID: 'hud-hint', accessibilityLabel: hintLabel, children: hintLabel }),
    onMore && button({ onPress: onMore, testID: 'hud-more', accessibilityLabel: 'More' })),
  DifficultyPills: ({ options, value, onChange }: { options: readonly { key: number | string; label: string; tag?: string }[]; value: number | string; onChange: (k: number | string) => void }) => <div data-role="radiogroup">
    {options.map(o => <React.Fragment key={o.key}>{button({ onPress: () => onChange(o.key), testID: `difficulty-${o.key}`, accessibilityLabel: o.tag ? `${o.label}, ${o.tag}` : o.label, checked: o.key === value, children: o.tag ? `${o.label} ${o.tag}` : o.label })}</React.Fragment>)}
  </div>,
  Sheet: ({ visible, title, mode = 'dim', onClose, children }: { visible: boolean; title?: string; mode?: string; onClose: () => void; children: React.ReactNode }) => visible ? h('aside', { testID: 'sheet', 'data-mode': mode, 'data-title': title }, title && <h2 key="t">{title}</h2>, button({ onPress: onClose, testID: 'sheet-close', accessibilityLabel: 'Close' }), children) : null,
};
/** Stand-in for `src/cove/CoveArt`, whose game pictures need the real SVG stack and whose board feel needs Reanimated. */
export const art = {
  MOTIF_SIZE: 56,
  motifFor: () => null,
  hasTileArt: () => false,
  BOARD_FEEL: null,
  FinishBurst: () => h('i', { testID: 'cove-finish-burst' }),
  CoveMotif: ({ game }: { game: string }) => h('i', { testID: 'cove-motif', 'data-game': game }),
  TodayArt: () => h('i', { testID: 'cove-today-art' }),
  tileArt: (game: string) => h('i', { testID: 'cove-motif', 'data-game': game }),
  SECTION_ICON: { numbers: 'Hash', words: 'TextAa', logic: 'PuzzlePiece', cards: 'Cards', originals: 'Sparkle', favorites: 'Star' },
  surfaceFor: (pastel: keyof typeof theme.pastels) => theme.pastels[pastel],
};

/** For tests that render the real kit: Reanimated as plain values, a silent haptic, and one stand-in per Phosphor glyph. */
export const reanimated = {
  default: { View: 'AnimatedView', createAnimatedComponent: (component: unknown) => component },
  ReduceMotion: { System: 'system', Never: 'never' },
  Easing: { linear: 'linear' },
  useAnimatedProps: (fn: () => object) => fn(),
  useAnimatedStyle: (fn: () => object) => fn(),
  useSharedValue: (initial: number) => { const box = { value: initial }; return { get: () => box.value, set: (v: number) => { box.value = v; } }; },
  withTiming: (value: number) => value,
  withSpring: (value: number) => value,
};
export const haptics = { impactAsync: () => Promise.resolve(), notificationAsync: () => Promise.resolve(), ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Success: 'success' } };
export async function icons() {
  const { readFileSync } = await import('node:fs');
  const names = [...readFileSync('src/ui/icons.ts', 'utf8').matchAll(/^\s+([A-Z]\w*),$/gm)].map(m => m[1]);
  return Object.fromEntries(names.map(name => [name, Object.assign((props: object) => <svg data-glyph={name} {...props}/>, { displayName: name })]));
}
