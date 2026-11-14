/** Guarded PLAN §10 input contract, independent of docs/qa-scope.json.
 * Current runtime adapters have no shared mechanic metadata. New input work MUST
 * add a literal qaMechanics annotation at its registration (or Cove metadata),
 * update this list plus the scope mapping, and receive human mapping review.
 * This is a registry by convention, not automatic detection of novel gestures.
 */
export const guardedMechanics = [
  'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09',
  'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17', 'M18',
  'M19', 'M20', 'M21', 'M22', 'M23', 'M24', 'M25', 'M26', 'M27',
  'M28', 'M29', 'M30', 'M31', 'M32', 'M33', 'M34', 'M35', 'M36',
];
