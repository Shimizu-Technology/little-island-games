/** Inline registrations are small authored sets; packed banks retain only immutable bank facts. */
export type InlineBank = { slot: number; engine: string; rules: number; entries: readonly { ordinal: number; hash: string }[]; awards: readonly number[]; cove: boolean };
export type PackedBank = { slot: number; engine: string; rules: number; first: number; count: number; family: string; packHash: string; awards: number | readonly number[]; cove: boolean };
export type Bank = InlineBank | PackedBank;
export const packedBank = (bank: Bank): bank is PackedBank => 'first' in bank;
export const bankSize = (bank: Bank) => packedBank(bank) ? bank.count : bank.entries.length;
export const bankOrdinal = (bank: Bank, index: number) => packedBank(bank) ? bank.first + index : bank.entries[index]?.ordinal;
export const bankAward = (bank: Bank, index: number) => typeof bank.awards === 'number' ? bank.awards : bank.awards[index];
