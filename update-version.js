const fs = require('fs');
const path = require('path');

// Read version from configuration file
const versionConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'version.json'), 'utf8'));
const NEW_VERSION = versionConfig.version;

// Files that need version updates
const FILES_TO_UPDATE = [
  {
    file: 'package.json',
    updates: [
      {
        type: 'json',
        path: 'version',
        value: NEW_VERSION
      }
    ]
  },
  {
    file: 'app.json',
    updates: [
      {
        type: 'json',
        path: 'expo.version',
        value: NEW_VERSION
      },
      {
        type: 'json',
        path: 'expo.android.versionCode',
        value: (currentVersionCode) => parseInt(currentVersionCode) + 1
      }
    ]
  },
  {
    file: 'app.config.js',
    updates: [
      {
        type: 'string',
        search: /version: "[^"]*"/g,
        replace: `version: "${NEW_VERSION}"`
      },
      {
        type: 'string',
        search: /versionCode: \d+/g,
        replace: (match) => {
          const currentCode = parseInt(match.split(': ')[1]);
          return `versionCode: ${currentCode + 1}`;
        }
      }
    ]
  },
  {
    file: 'src/contexts/NotificationContext.tsx',
    updates: [
      {
        type: 'string',
        search: /appVersion: '[^']*'/g,
        replace: `appVersion: '${NEW_VERSION}'`
      }
    ]
  },
  {
    file: 'src/contexts/LocalizationContext.tsx',
    updates: [
      {
        type: 'string',
        search: /'settings_screen_app_version': 'FinTracker v[^']*'/g,
        replace: `'settings_screen_app_version': 'FinTracker v${NEW_VERSION}'`
      }
    ]
  }
];

function updateJsonFile(filePath, updates) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let jsonData = JSON.parse(content);
    
    updates.forEach(update => {
      const pathParts = update.path.split('.');
      let current = jsonData;
      
      // Navigate to the parent of the target property
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      // Update the target property
      const finalKey = pathParts[pathParts.length - 1];
      if (typeof update.value === 'function') {
        current[finalKey] = update.value(current[finalKey]);
      } else {
        current[finalKey] = update.value;
      }
    });
    
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
    console.log(`✅ Updated ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function updateStringFile(filePath, updates) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    updates.forEach(update => {
      const matches = content.match(update.search);
      if (matches) {
        if (typeof update.replace === 'function') {
          // Handle function-based replacements (like incrementing versionCode)
          content = content.replace(update.search, update.replace);
        } else {
          // Handle string replacements
          content = content.replace(update.search, update.replace);
        }
        console.log(`✅ Updated ${matches.length} occurrence(s) in ${filePath}`);
      } else {
        console.warn(`⚠️  No matches found in ${filePath} for pattern: ${update.search}`);
      }
    });
    
    fs.writeFileSync(filePath, content);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function main() {
  console.log(`🚀 Updating app version to ${NEW_VERSION}...\n`);
  
  FILES_TO_UPDATE.forEach(fileConfig => {
    const filePath = path.join(__dirname, fileConfig.file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    if (fileConfig.updates[0].type === 'json') {
      updateJsonFile(filePath, fileConfig.updates);
    } else if (fileConfig.updates[0].type === 'string') {
      updateStringFile(filePath, fileConfig.updates);
    }
  });
  
  console.log(`\n✨ Version update complete! All files have been updated to version ${NEW_VERSION}`);
  console.log('\n📝 Files updated:');
  FILES_TO_UPDATE.forEach(fileConfig => {
    console.log(`   - ${fileConfig.file}`);
  });
  
  console.log('\n🔄 Next steps:');
  console.log('   1. Review the changes');
  console.log('   2. Test your app');
  console.log('   3. Commit the changes');
  console.log('   4. Build and deploy if ready');
}

if (require.main === module) {
  main();
}

module.exports = { NEW_VERSION, FILES_TO_UPDATE };