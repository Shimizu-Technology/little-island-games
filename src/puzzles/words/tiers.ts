/** Plain difficulty words over the engine tiers. Presentation only: tiers, bands and saved refs are unchanged. */
export const searchTiers = [
  { tier: 1, label: 'Easy', size: 6, directions: 'Across and down' },
  { tier: 2, label: 'Medium', size: 9, directions: 'Across and down' },
  { tier: 3, label: 'Hard', size: 12, directions: 'Across, down and slanted' },
  { tier: 4, label: 'Expert', size: 15, directions: 'Every direction' },
  { tier: 5, label: 'Master', size: null, directions: 'Every direction' },
  { tier: 6, label: 'Master+', size: null, directions: 'Every direction' },
] as const;
export const searchTier = (tier: number) => searchTiers.find(t => t.tier === tier);
