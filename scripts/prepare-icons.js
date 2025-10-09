/**
 * Icon Preparation Script
 * This script helps prepare app icons in the required formats and sizes
 * 
 * Required icon sizes:
 * - icon.png: 1024x1024 (iOS App Store)
 * - adaptive-icon.png: 1024x1024 (Android adaptive icon foreground)
 * - favicon.png: 48x48 (Web favicon)
 * 
 * Instructions:
 * 1. Save your new icon as "new-icon.png" in the assets folder (1024x1024 recommended)
 * 2. Run: node scripts/prepare-icons.js
 * 3. The script will generate all required icon sizes
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 FinTracker Icon Preparation');
console.log('================================');
console.log('');
console.log('To update your app icon:');
console.log('');
console.log('1. Save your new icon as "new-icon.png" in the assets folder');
console.log('   - Recommended size: 1024x1024 pixels');
console.log('   - Format: PNG with transparent background');
console.log('');
console.log('2. Required icon files:');
console.log('   ├── icon.png (1024x1024) - Main app icon');
console.log('   ├── adaptive-icon.png (1024x1024) - Android adaptive icon');
console.log('   ├── favicon.png (48x48) - Web favicon');
console.log('   └── splash.png (1284x2778) - Splash screen');
console.log('');
console.log('3. Manual steps (since we cannot auto-resize images):');
console.log('   - Use an online tool like https://appicon.co/ or');
console.log('   - Use design software like Figma, Photoshop, or GIMP');
console.log('   - Generate the required sizes and replace the files');
console.log('');
console.log('4. Update app.json configuration if needed');
console.log('');

// Check if new icon exists
const assetsPath = path.join(__dirname, '..', 'assets');
const newIconPath = path.join(assetsPath, 'new-icon.png');

if (fs.existsSync(newIconPath)) {
  console.log('✅ Found new-icon.png in assets folder');
  console.log('');
  console.log('Next steps:');
  console.log('1. Create the following icon sizes from your new-icon.png:');
  console.log('   - icon.png: 1024x1024');
  console.log('   - adaptive-icon.png: 1024x1024');
  console.log('   - favicon.png: 48x48');
  console.log('2. Replace the existing files in the assets folder');
  console.log('3. Run: npm run clean && npm start');
} else {
  console.log('❌ Please save your new icon as "new-icon.png" in the assets folder first');
}

console.log('');
console.log('📱 Icon Guidelines:');
console.log('- Use a square format (1:1 ratio)');
console.log('- Keep important elements away from edges (safe area)');
console.log('- Use high contrast and clear visibility');
console.log('- Test on both light and dark backgrounds');
console.log('- Ensure it looks good at small sizes');