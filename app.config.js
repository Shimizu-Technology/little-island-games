/** Opt-in measurement app. The default export preserves the family configuration byte-for-byte. */
module.exports = ({ config }) => {
  if (process.env.LITTLE_ISLAND_VARIANT !== 'development') return config;
  const { NSBonjourServices, NSLocalNetworkUsageDescription, ...infoPlist } = config.ios.infoPlist ?? {};
  return {
    ...config,
    name: 'Little Island Dev',
    scheme: 'littleisland-dev',
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.shimizutechnology.littleisland.dev',
      infoPlist: { ...infoPlist, UIFileSharingEnabled: true, LSSupportsOpeningDocumentsInPlace: true },
    },
    android: { ...config.android, package: 'com.shimizutechnology.littleisland.dev' },
    // Measurement metadata is local and deliberately has no production update channel.
    extra: { ...config.extra, lagoonMeasurement: true },
  };
};
