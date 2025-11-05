module.exports = function(api) {
  api.cache(true);
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  const plugins = [
    // Essential plugins
    'react-native-reanimated/plugin', // Must be last
  ];
  
  // Add optimization plugins for production
  if (isProduction) {
    plugins.unshift(
      // Remove console statements in production
      ['transform-remove-console', { exclude: ['error', 'warn'] }],
    );
  }
  
  return {
    presets: [
      ['babel-preset-expo', {
        jsxRuntime: 'automatic',
        lazyImports: true,
      }],
    ],
    plugins,
  };
};