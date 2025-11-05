#!/usr/bin/env node

/**
 * Google Sign-In Configuration Validator
 * Run this script to validate your Google Sign-In setup before building
 * Usage: node scripts/validate-google-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Google Sign-In Configuration...\n');

// Expected values
const EXPECTED_PACKAGE = 'com.oussamaaaaa.finex';
const EXPECTED_SHA1 = '04d1e2df06d3f1b99f2536aa3dbc5f78afaf3f93';
const EXPECTED_WEB_CLIENT_ID = '1034435232632-cfdpko20rk29mphsbo1o7i5pvk9lq1dq.apps.googleusercontent.com';

let errors = [];
let warnings = [];

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
  errors.push('❌ Could not read or parse app.json');
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

// 3. Check google-services.json
console.log('\n🔥 Checking google-services.json...');
try {
  const googleServices = JSON.parse(fs.readFileSync('android/app/google-services.json', 'utf8'));
  
  // Find the client for our package
  let clientFound = false;
  let shaMatches = false;
  let clientIdFound = false;
  
  for (const client of googleServices.client) {
    if (client.client_info.android_client_info.package_name === EXPECTED_PACKAGE) {
      clientFound = true;
      console.log('✅ Found client configuration for package:', EXPECTED_PACKAGE);
      
      // Check OAuth clients
      for (const oauthClient of client.oauth_client) {
        if (oauthClient.client_type === 1 && oauthClient.android_info) {
          if (oauthClient.android_info.certificate_hash === EXPECTED_SHA1) {
            shaMatches = true;
            console.log('✅ SHA-1 fingerprint matches:', EXPECTED_SHA1);
          }
          clientIdFound = true;
          console.log('✅ Found Android OAuth client ID:', oauthClient.client_id);
        }
        if (oauthClient.client_type === 3) {
          if (oauthClient.client_id === EXPECTED_WEB_CLIENT_ID) {
            console.log('✅ Web client ID matches expected value');
          } else {
            warnings.push(`⚠️ Web client ID mismatch: expected "${EXPECTED_WEB_CLIENT_ID}", got "${oauthClient.client_id}"`);
          }
        }
      }
      break;
    }
  }
  
  if (!clientFound) {
    errors.push(`❌ No client configuration found for package: ${EXPECTED_PACKAGE}`);
  }
  if (!shaMatches) {
    errors.push(`❌ SHA-1 fingerprint mismatch: expected "${EXPECTED_SHA1}"`);
  }
  if (!clientIdFound) {
    errors.push('❌ No Android OAuth client found');
  }
  
} catch (error) {
  errors.push('❌ Could not read or parse android/app/google-services.json');
}

// 4. Check .env file
console.log('\n🌍 Checking .env file...');
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  
  if (envContent.includes(EXPECTED_WEB_CLIENT_ID)) {
    console.log('✅ Web Client ID found in .env file');
  } else {
    errors.push(`❌ Web Client ID not found in .env file: ${EXPECTED_WEB_CLIENT_ID}`);
  }
  
  if (envContent.match(/^EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=/m)) {
    warnings.push('⚠️ iOS Client ID is set but should be commented out for Android-only builds');
  } else {
    console.log('✅ iOS Client ID is properly commented out');
  }
  
  if (envContent.includes(EXPECTED_PACKAGE)) {
    console.log('✅ Package name reference found in .env comments');
  } else {
    warnings.push(`⚠️ Package name reference not found in .env comments: ${EXPECTED_PACKAGE}`);
  }
  
} catch (error) {
  warnings.push('⚠️ Could not read .env file');
}

// 5. Summary
console.log('\n📊 Configuration Validation Summary:');
console.log('=====================================');

if (errors.length === 0) {
  console.log('🎉 All critical configurations are correct!');
  console.log('✅ Your Google Sign-In should work without DEVELOPER_ERROR');
} else {
  console.log('🚨 CRITICAL ERRORS FOUND:');
  errors.forEach(error => console.log(error));
  console.log('\n❗ Fix these errors before building to avoid DEVELOPER_ERROR');
}

if (warnings.length > 0) {
  console.log('\n⚠️ WARNINGS:');
  warnings.forEach(warning => console.log(warning));
}

console.log('\n🛠️ Build Commands:');
console.log('Clean build: cd android && ./gradlew clean && cd ..');
console.log('Rebuild app: npx expo run:android');
console.log('EAS build:  eas build --platform android --profile development');

console.log('\n📚 If you still get DEVELOPER_ERROR after fixing all issues:');
console.log('1. Make sure Android emulator/device has Google Play Services');
console.log('2. Check Firebase Console for the exact package name and SHA-1');
console.log('3. Regenerate debug keystore if SHA-1 doesn\'t match');

// Exit with error code if there are critical errors
process.exit(errors.length > 0 ? 1 : 0);