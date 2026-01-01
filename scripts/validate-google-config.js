#!/usr/bin/env node

/**
 * Google Sign-In Configuration Validator
 * Run this script to validate your Google Sign-In setup before building
 * Usage: node scripts/validate-google-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Google Sign-In Configuration...\n');

// Expected values (source of truth is Android app id)
const EXPECTED_PACKAGE = 'com.oussamaaaaa.finex';

let errors = [];
let warnings = [];

const safeRead = (p) => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
};

const fileExists = (p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
};

// 1. Check app.json
console.log('📱 Checking app.json...');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const androidPackage = appJson.expo.android.package;
  const iosBundle = appJson.expo.ios.bundleIdentifier;
  
  if (androidPackage === EXPECTED_PACKAGE) {
    console.log('✅ Android package name is correct:', androidPackage);
  } else {
    errors.push(`❌ Android package mismatch: expected "${EXPECTED_PACKAGE}", got "${androidPackage}"`);
  }
  
  if (iosBundle === EXPECTED_PACKAGE) {
    console.log('✅ iOS bundle identifier is correct:', iosBundle);
  } else {
    warnings.push(`⚠️ iOS bundle mismatch: expected "${EXPECTED_PACKAGE}", got "${iosBundle}"`);
  }
} catch (error) {
  warnings.push('⚠️ Could not read or parse app.json (app.config.js may be used instead)');
}

// 2. Check android/app/build.gradle
console.log('\n🤖 Checking Android build.gradle...');
try {
  const buildGradle = fs.readFileSync('android/app/build.gradle', 'utf8');
  const applicationIdMatch = buildGradle.match(/applicationId\s+['"]([^'"]+)['"]/);
  const namespaceMatch = buildGradle.match(/namespace\s+['"]([^'"]+)['"]/);
  
  if (applicationIdMatch && applicationIdMatch[1] === EXPECTED_PACKAGE) {
    console.log('✅ Android applicationId is correct:', applicationIdMatch[1]);
  } else {
    errors.push(`❌ Android applicationId mismatch: expected "${EXPECTED_PACKAGE}", got "${applicationIdMatch ? applicationIdMatch[1] : 'not found'}"`);
  }
  
  if (namespaceMatch && namespaceMatch[1] === EXPECTED_PACKAGE) {
    console.log('✅ Android namespace is correct:', namespaceMatch[1]);
  } else {
    warnings.push(`⚠️ Android namespace mismatch: expected "${EXPECTED_PACKAGE}", got "${namespaceMatch ? namespaceMatch[1] : 'not found'}"`);
  }
} catch (error) {
  errors.push('❌ Could not read android/app/build.gradle');
}

// 3. Check build-time Web Client ID env
console.log('\n🌍 Checking build-time env for Google Web Client ID...');
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
if (typeof webClientId === 'string' && webClientId.trim()) {
  console.log('✅ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set');
} else {
  warnings.push('⚠️ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. Google Sign-In will fail in preview/production builds.');
}

// 4. Optional: google-services.json
console.log('\n🔥 Checking google-services.json (optional)...');
const googleServicesPath = path.join('android', 'app', 'google-services.json');
if (!fileExists(googleServicesPath)) {
  warnings.push('⚠️ android/app/google-services.json not found. This is OK if you are not using native Firebase config, but Google Sign-In often relies on correct Android OAuth setup (package + SHA).');
} else {
  try {
    const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));
    const clients = Array.isArray(googleServices.client) ? googleServices.client : [];
    const client = clients.find((c) => c?.client_info?.android_client_info?.package_name === EXPECTED_PACKAGE);
    if (!client) {
      warnings.push(`⚠️ google-services.json does not contain a client for package: ${EXPECTED_PACKAGE}`);
    } else {
      console.log('✅ google-services.json contains client for package:', EXPECTED_PACKAGE);
    }
  } catch {
    warnings.push('⚠️ Could not read/parse android/app/google-services.json');
  }
}

// 5. Summary
console.log('\n📊 Configuration Validation Summary:');
console.log('=====================================');

if (errors.length === 0) {
  console.log('🎉 All critical configurations are correct!');
  console.log('✅ Your Google Sign-In should be correctly wired for build-time config');
} else {
  console.log('🚨 CRITICAL ERRORS FOUND:');
  errors.forEach(error => console.log(error));
  console.log('\n❗ Fix these errors before building');
}

if (warnings.length > 0) {
  console.log('\n⚠️ WARNINGS:');
  warnings.forEach(warning => console.log(warning));
}

console.log('\n🛠️ Build Commands:');
console.log('Clean build: cd android && ./gradlew clean && cd ..');
console.log('Rebuild app: npx expo run:android');
console.log('EAS build (preview):  eas build --platform android --profile preview');
console.log('EAS build (production):  eas build --platform android --profile production');

console.log('\n📌 If Google Sign-In fails only on EAS preview/release:');
console.log('1) Confirm EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set for that build profile (EAS Secrets or eas.json env).');
console.log('2) Add the signing certificate SHA-1/SHA-256 used by that build to Firebase/Google Cloud Android OAuth config.');
console.log('   - Get SHA via: cd android && ./gradlew signingReport');
console.log('   - Or via: eas credentials -p android (if using EAS-managed credentials)');

console.log('\n📚 If you still get DEVELOPER_ERROR after fixing all issues:');
console.log('1) Make sure the device has Google Play Services');
console.log('2) Double-check Android package name and signing SHA in Google Cloud Console');

// Exit with error code if there are critical errors
process.exit(errors.length > 0 ? 1 : 0);