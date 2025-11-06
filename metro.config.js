// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for React Native monorepos
const { resolver: { sourceExts, assetExts } } = config;

// Force metro to process SVG and other files
config.resolver.assetExts = assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...sourceExts, 'svg'];

// Add node_modules polyfills for React Native
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'react-native-crypto',
  stream: 'stream-browserify',
  buffer: 'buffer',
};

// Advanced performance optimizations
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    ecma: 8,
    keep_fnames: false,
    mangle: {
      keep_fnames: false,
      reserved: ['$', 'exports', 'require'],
    },
    output: {
      ascii_only: true,
      quote_keys: true,
      wrap_iife: true,
      comments: false,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: true,
    compress: {
      arguments: true,
      arrows: true,
      booleans: true,
      collapse_vars: true,
      comparisons: true,
      computed_props: true,
      conditionals: true,
      dead_code: true,
      directives: true,
      drop_console: !process.env.EXPO_DEBUG,
      drop_debugger: true,
      evaluate: true,
      expression: true,
      hoist_funs: true,
      hoist_props: true,
      hoist_vars: false,
      if_return: true,
      inline: true,
      join_vars: true,
      keep_fargs: false,
      keep_fnames: false,
      keep_infinity: false,
      loops: true,
      negate_iife: true,
      properties: true,
      pure_getters: 'strict',
      pure_funcs: ['console.log', 'console.info', 'console.debug'],
      reduce_funcs: true,
      reduce_vars: true,
      sequences: true,
      side_effects: true,
      switches: true,
      typeofs: true,
      unsafe: false,
      unsafe_arrows: true,
      unsafe_comps: true,
      unsafe_Function: true,
      unsafe_math: true,
      unsafe_symbols: true,
      unsafe_methods: true,
      unsafe_proto: true,
      unsafe_regexp: true,
      unsafe_undefined: true,
      unused: true,
    },
  },
};

// Enhanced bundle splitting and caching
config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => [
    require.resolve('react-native/Libraries/Core/InitializeCore'),
  ],
  createModuleIdFactory: () => (path) => {
    // Use shorter module IDs in production
    const projectRoot = config.projectRoot || __dirname;
    let name = path.replace(projectRoot, '');
    
    // Shorter names for common paths
    name = name.replace(/\/node_modules\//g, '/n/');
    name = name.replace(/\/src\//g, '/s/');
    name = name.replace(/\/components\//g, '/c/');
    name = name.replace(/\/screens\//g, '/sc/');
    name = name.replace(/\/utils\//g, '/u/');
    name = name.replace(/\/services\//g, '/sv/');
    
    return name;
  },
};

// Aggressive exclusion patterns for smaller bundles.
// Avoid filtering out "spec" folders because some dependencies (e.g. Google Sign-In)
// ship production code from those directories.
config.resolver.blockList = [
  /.*\/__tests__\/.*/,
  /.*\/node_modules\/.*\/test\/.*/,
  /.*\/\.\*/, 
  /.*\/\.(test|spec)\.(js|ts|tsx)$/,
  /.*\/coverage\/.*/,
  /.*\/docs\/.*/,
  /.*\/examples\/.*/,
  /.*\/\.git\/.*/,
  /.*\/\.vscode\/.*/,
  /.*\/\.(md|txt|log)$/,
];

// Tree shaking configuration
config.resolver.enableGlobalPackages = false;
config.resolver.enableSymlinks = false;

// Commented out lodash resolver as it's causing bundling issues
// config.resolver.resolveRequest = (context, moduleName, platform) => {
//   // Custom resolution for better tree shaking
//   if (moduleName.includes('lodash')) {
//     // Force lodash-es for better tree shaking
//     return {
//       ...context.resolveRequest(context, moduleName.replace('lodash', 'lodash-es'), platform),
//     };
//   }
//   
//   return context.resolveRequest(context, moduleName, platform);
// };

module.exports = config;