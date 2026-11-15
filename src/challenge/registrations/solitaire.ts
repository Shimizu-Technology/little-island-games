import facts from '../../puzzles/table/packs.generated.json';
import {defineSolitaire,type BankFacts,type TableAction,type TableView} from '../../puzzles/table/registration';
import type {TablePayload} from '../../puzzles/table/checkpoint';
/** G7a: standard 52-card table, drag plus tap alternatives. Mapping review remains with the lead. */
export const qaMechanics=['M23'] as const;
export const registration=defineSolitaire(facts as BankFacts[]);
export type Payload=TablePayload;
export type Action=TableAction;
export type State=TableView;
