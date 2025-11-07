const fs = require('fs');
const path = require('path');

// Define source and destination paths
const srcPublic = path.join(__dirname, '../src/public');
const destPublic = path.join(__dirname, '../dist/public');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destPublic)) {
  fs.mkdirSync(destPublic, { recursive: true });
}

// Copy all files from src/public to dist/public
function copyRecursive(src, dest) {
  // Ensure destination directory exists
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);

  files.forEach((file) => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copyRecursive(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied: ${srcFile} -> ${destFile}`);
    }
  });
}

try {
  if (fs.existsSync(srcPublic)) {
    copyRecursive(srcPublic, destPublic);
    console.log('✓ Assets copied successfully');
  } else {
    console.warn(`⚠ Source directory not found: ${srcPublic}`);
  }
} catch (error) {
  console.error('✗ Error copying assets:', error);
  process.exit(1);
}
