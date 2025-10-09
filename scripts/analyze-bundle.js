#!/usr/bin/env node

/**
 * Bundle Size Analyzer for React Native Expo App
 * This script helps identify large dependencies and optimization opportunities
 */

const fs = require('fs');
const path = require('path');

// Function to get file size recursively
function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
  
  return totalSize;
}

// Function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Analyze node_modules
function analyzeNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('❌ node_modules directory not found');
    return;
  }
  
  console.log('📦 Analyzing node_modules...\n');
  
  const packages = fs.readdirSync(nodeModulesPath);
  const packageSizes = [];
  
  packages.forEach(packageName => {
    if (packageName.startsWith('.')) return;
    
    const packagePath = path.join(nodeModulesPath, packageName);
    const size = getDirectorySize(packagePath);
    
    packageSizes.push({
      name: packageName,
      size: size,
      formattedSize: formatBytes(size)
    });
  });
  
  // Sort by size (largest first)
  packageSizes.sort((a, b) => b.size - a.size);
  
  console.log('🔍 Top 20 largest packages:');
  console.log('================================');
  
  packageSizes.slice(0, 20).forEach((pkg, index) => {
    console.log(`${index + 1}. ${pkg.name}: ${pkg.formattedSize}`);
  });
  
  const totalSize = packageSizes.reduce((sum, pkg) => sum + pkg.size, 0);
  console.log(`\n📊 Total node_modules size: ${formatBytes(totalSize)}`);
  
  return packageSizes;
}

// Analyze source code
function analyzeSourceCode() {
  const srcPath = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcPath)) {
    console.log('❌ src directory not found');
    return;
  }
  
  console.log('\n💻 Analyzing source code...\n');
  
  const directories = ['components', 'screens', 'services', 'utils', 'contexts'];
  
  directories.forEach(dir => {
    const dirPath = path.join(srcPath, dir);
    if (fs.existsSync(dirPath)) {
      const size = getDirectorySize(dirPath);
      console.log(`${dir}: ${formatBytes(size)}`);
    }
  });
  
  const totalSrcSize = getDirectorySize(srcPath);
  console.log(`\n📊 Total src size: ${formatBytes(totalSrcSize)}`);
}

// Check for optimization opportunities
function checkOptimizations(packageSizes) {
  console.log('\n🚀 Optimization Recommendations:');
  console.log('==================================');
  
  const largeDeps = packageSizes.filter(pkg => pkg.size > 5 * 1024 * 1024); // > 5MB
  
  if (largeDeps.length > 0) {
    console.log('\n⚠️  Large dependencies to review:');
    largeDeps.forEach(pkg => {
      console.log(`- ${pkg.name} (${pkg.formattedSize})`);
      
      // Specific recommendations
      if (pkg.name.includes('chart')) {
        console.log('  💡 Consider using a lighter charting library');
      }
      if (pkg.name.includes('moment')) {
        console.log('  💡 Consider switching to date-fns or dayjs');
      }
      if (pkg.name.includes('@expo')) {
        console.log('  💡 Check if all Expo modules are needed');
      }
    });
  }
  
  console.log('\n✅ General optimization tips:');
  console.log('- Enable ProGuard/R8 for Android (already configured)');
  console.log('- Use Android App Bundle (.aab) instead of APK');
  console.log('- Enable code splitting where possible');
  console.log('- Optimize images and use WebP format');
  console.log('- Remove unused dependencies and code');
  console.log('- Use tree shaking to eliminate dead code');
}

// Main analysis
function main() {
  console.log('🔍 FinTracker Bundle Size Analysis');
  console.log('===================================\n');
  
  const packageSizes = analyzeNodeModules();
  analyzeSourceCode();
  
  if (packageSizes) {
    checkOptimizations(packageSizes);
  }
  
  console.log('\n📝 Next steps:');
  console.log('- Run "npm run build:android" to create optimized build');
  console.log('- Use "eas build --platform android --profile production" for production');
  console.log('- Monitor bundle size after each change');
}

main();