// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for React Native monorepos
const { resolver: { sourceExts, assetExts } } = config;

// Force metro to process SVG and other files
config.resolver.assetExts = assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...sourceExts, 'svg'];

// Performance optimizations
config.transformer.minifierConfig = {
  mangle: {
    keep_fnames: true,
  },
  output: {
    ascii_only: true,
    quote_keys: true,
    wrap_iife: true,
  },
  sourceMap: {
    includeSources: false,
  },
  toplevel: false,
  compress: {
    reduce_funcs: false,
  },
};

// Bundle splitting for better caching
config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => [
    require.resolve('react-native/Libraries/Core/InitializeCore'),
  ],
};

// Exclude development files from production builds
config.resolver.blacklistRE = /.*\/__tests__\/.*|.*\/node_modules\/.*\/(test|spec)\/.*|.*\/\..*|.*\/\.(test|spec)\.(js|ts|tsx)$/;

module.exports = config;