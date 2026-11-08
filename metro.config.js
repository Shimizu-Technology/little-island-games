const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Puzzle banks ship as lazily read files, so the catalog never becomes eager JavaScript.
config.resolver.assetExts.push('lipuzzle');

module.exports = config;
