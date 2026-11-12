import React from 'react';
import { View } from 'react-native';
import { Button, Copy } from '../../../components/ui';
import type { Command } from './engine';

/** One editor for the School board and the Challenge board: tap a card in the plan, then
 * Replace it, Insert before it, Remove it, or go back to adding at the end. */
export type EditMode = 'replace' | 'insert';
/** At the largest text the choice line and its buttons would fill the pinned editing area, so
 * they stop at 1.5× (the pinned-title cap), keeping Replace and Insert before in reach. */
export const EDIT_TEXT_MAX = 1.5;
export const planCardLabel = (at: number, label: string, extra = '') =>
  `Card ${at + 1}: ${label}${extra}. Select to change, insert before, or remove.`;
export const commandActionLabel = (selected: number | null, mode: EditMode, label: string) =>
  `${selected === null ? 'Add' : mode === 'replace' ? 'Replace with' : 'Insert'} ${label}`;
/** The plan card a shown hint is about (Change, Remove, or Insert before it); none when it adds at the end. */
export const hintedCard = (edit: { at: number } | undefined, length: number) => (edit && edit.at < length ? edit.at : null);
export const HINTED = ', the hint is about this card';
/** The program after pressing a command. Null when nothing changes (replacing a card with itself). */
export function editPlan(program: readonly Command[], selected: number | null, mode: EditMode, c: Command): Command[] | null {
  if (selected === null || selected >= program.length) return program.length >= 80 ? null : [...program, c];
  if (mode === 'replace') return program[selected] === c ? null : program.map((p, i) => (i === selected ? c : p));
  return program.length >= 80 ? null : [...program.slice(0, selected), c, ...program.slice(selected)];
}
export function PlanEditChoices({
  at,
  label,
  mode,
  disabled,
  setMode,
  onRemove,
  onAddAtEnd,
}: {
  at: number;
  label: string;
  mode: EditMode;
  disabled: boolean;
  setMode: (mode: EditMode) => void;
  onRemove: () => void;
  onAddAtEnd: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Copy maxFontSizeMultiplier={EDIT_TEXT_MAX}>
        Card {at + 1}: {label}. Choose a command to {mode === 'replace' ? 'replace it' : 'insert before it'}.
      </Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button compact quiet maxFontSizeMultiplier={EDIT_TEXT_MAX} selected={mode === 'replace'} disabled={disabled} onPress={() => setMode('replace')}>
          Replace
        </Button>
        <Button compact quiet maxFontSizeMultiplier={EDIT_TEXT_MAX} selected={mode === 'insert'} disabled={disabled} onPress={() => setMode('insert')}>
          Insert before
        </Button>
        <Button compact quiet maxFontSizeMultiplier={EDIT_TEXT_MAX} disabled={disabled} onPress={onRemove}>
          Remove card
        </Button>
        <Button compact quiet maxFontSizeMultiplier={EDIT_TEXT_MAX} disabled={disabled} onPress={onAddAtEnd}>
          Add at end
        </Button>
      </View>
    </View>
  );
}
