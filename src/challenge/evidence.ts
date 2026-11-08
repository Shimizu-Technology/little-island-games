import type { DareRule, Evidence } from './types';
/** No time, day, stars, or historical help totals can be evidence for a mark. */
export function proves(rule: DareRule, evidence: Evidence, help: 'allowed'|'independent', together: boolean): boolean {
  if (!evidence.solved || (help === 'independent' && (together || evidence.helpUsed || evidence.failed))) return false;
  switch (rule.kind) {
    case 'par': return evidence.metrics[rule.metric] !== undefined && evidence.metrics[rule.metric]! <= rule.max;
    case 'clean': return !together && !evidence.helpUsed && !evidence.failed;
    case 'plan': return evidence.runs > 0 && evidence.runs <= rule.max;
    case 'blind': return evidence.supportOff;
    case 'whole': return !together && !evidence.helpUsed && !evidence.failed && evidence.checks === 1;
    case 'two-ways': return evidence.solution !== null && evidence.firstSolutions.length > 0 && !evidence.firstSolutions.includes(evidence.solution);
    case 'pick-up': return evidence.objectives.includes(rule.objective);
    case 'own-read': return !together && evidence.ownRead && !evidence.heard && !evidence.helpUsed && !evidence.failed;
    case 'edits': return evidence.edits <= rule.max;
  }
}
