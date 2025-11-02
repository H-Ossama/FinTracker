const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

module.exports = () => {
  // Load the base config from app.json
  const appJson = require('./app.json');
  const baseConfig = appJson.expo;

  let appName = baseConfig.name;
  let bundleId = baseConfig.android.package;

  // Modify based on build variant
  if (IS_DEV) {
    appName = 'FINEX (Dev)';
    bundleId = 'com.oussamaaaaa.fintracker.dev';
  } else if (IS_PREVIEW) {
    appName = 'FINEX (Preview)';
    bundleId = 'com.oussamaaaaa.fintracker.preview';
  }

  return {
    ...baseConfig,
    name: appName,
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: bundleId,
    },
    android: {
      ...baseConfig.android,
      package: bundleId,
    },
  };
};
