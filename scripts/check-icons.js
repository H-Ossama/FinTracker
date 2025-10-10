const fs = require('fs');
const path = require('path');

// Check if icon files exist and get their sizes
const assetsDir = path.join(__dirname, '..', 'assets');
const iconFiles = ['icon.png', 'adaptive-icon.png', 'favicon.png', 'splash.png'];

console.log('🔍 Checking icon files in assets directory...\n');

iconFiles.forEach(filename => {
  const filePath = path.join(assetsDir, filename);
  
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${filename}:`);
    console.log(`   📁 Path: ${filePath}`);
    console.log(`   📏 Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   📅 Modified: ${stats.mtime.toLocaleDateString()}\n`);
  } else {
    console.log(`❌ ${filename}: File not found\n`);
  }
});

console.log('📋 Icon Requirements:');
console.log('   🔷 icon.png: Should be 1024x1024px (for app stores)');
console.log('   🔷 adaptive-icon.png: Should be 1024x1024px (Android adaptive icon)');
console.log('   🔷 favicon.png: Should be 48x48px (web favicon)');
console.log('   🔷 splash.png: Recommended 2048x2732px or similar high resolution\n');

console.log('🔧 To fix icon issues:');
console.log('   1. Ensure icons meet the size requirements above');
console.log('   2. Run: npx expo prebuild --clean');
console.log('   3. Rebuild your app');
console.log('   4. For EAS builds, increment versionCode in app.json');