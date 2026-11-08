/** Only the separately identified measurement build may replay or write receipts. */
export function lagoonMeasurement(config:{extra?:Record<string,unknown>}|null|undefined,debug:boolean) {
 return debug && config?.extra?.lagoonMeasurement===true;
}
