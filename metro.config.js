const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Puzzle banks ship as lazily read files, so the catalog never becomes eager JavaScript.
config.resolver.assetExts.push('lipuzzle');
// The existing shared-host QA flag limits build workers, never the app's frame loop.
if (process.env.LITTLE_ISLAND_SLOW_HOST === '1') config.maxWorkers = 2;
module.exports = config;
