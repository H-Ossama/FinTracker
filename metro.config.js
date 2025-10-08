// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for React Native monorepos
const { resolver: { sourceExts, assetExts } } = config;

// Force metro to process SVG and other files
config.resolver.assetExts = assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...sourceExts, 'svg'];

module.exports = config;