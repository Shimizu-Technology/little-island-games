const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// The existing shared-host QA flag limits build workers, never the app's frame loop.
if (process.env.LITTLE_ISLAND_SLOW_HOST === '1') config.maxWorkers = 2;
module.exports = config;
