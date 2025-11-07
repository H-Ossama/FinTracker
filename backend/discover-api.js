#!/usr/bin/env node

const axios = require('axios');

// Test URLs to try
const TEST_URLS = [
  'https://finex-production.up.railway.app',
  'https://fintracker-production.up.railway.app', 
  'http://localhost:3001',
  'http://localhost:8080'
];

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testUrl(baseUrl) {
  log('blue', `\n🔍 Testing: ${baseUrl}`);
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${baseUrl}/health`, { timeout: 10000 });
    log('green', `✅ Health check: ${healthResponse.status} - ${healthResponse.data.status}`);
    
    if (healthResponse.data.database) {
      log('green', `   Database: ${healthResponse.data.database}`);
    }
    if (healthResponse.data.environment) {
      log('blue', `   Environment: ${healthResponse.data.environment}`);
    }
    if (healthResponse.data.uptime) {
      log('blue', `   Uptime: ${healthResponse.data.uptime}s`);
    }
    
    // Test root endpoint
    try {
      const rootResponse = await axios.get(`${baseUrl}/`, { timeout: 5000 });
      log('green', `✅ Root endpoint: ${rootResponse.status}`);
    } catch (error) {
      log('yellow', `⚠️  Root endpoint failed: ${error.message}`);
    }
    
    return true;
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('red', `❌ Connection refused - Server not running`);
    } else if (error.code === 'ENOTFOUND') {
      log('red', `❌ DNS resolution failed - URL not found`);
    } else if (error.response) {
      log('red', `❌ HTTP ${error.response.status}: ${error.response.statusText}`);
      if (error.response.data) {
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    } else {
      log('red', `❌ ${error.message}`);
    }
    return false;
  }
}

async function findWorkingUrl() {
  log('yellow', '🚀 FinTracker API Discovery & Testing\n');
  
  let workingUrl = null;
  
  for (const url of TEST_URLS) {
    const isWorking = await testUrl(url);
    if (isWorking) {
      workingUrl = url;
      break;
    }
  }
  
  if (workingUrl) {
    log('green', `\n🎉 Found working API at: ${workingUrl}`);
    log('green', `✅ Your FinTracker backend is operational!`);
    
    // Provide testing instructions
    log('blue', `\n📋 Quick Test Commands:`);
    console.log(`   Health: curl ${workingUrl}/health`);
    console.log(`   Root:   curl ${workingUrl}/`);
    console.log(`   Test:   curl ${workingUrl}/test`);
    
  } else {
    log('red', `\n❌ No working API endpoints found.`);
    log('yellow', `\n🔧 Troubleshooting suggestions:`);
    console.log(`   1. Check if Railway service is running`);
    console.log(`   2. Verify Railway environment variables`);
    console.log(`   3. Check Railway deployment logs`);
    console.log(`   4. Try starting local server: npm run dev`);
  }
  
  return workingUrl;
}

// Railway deployment check
async function checkRailwayInfo() {
  log('blue', `\n🚂 Railway Deployment Information:`);
  
  const railwayUrls = [
    'https://finex-production.up.railway.app',
    'https://fintracker-production.up.railway.app'
  ];
  
  for (const url of railwayUrls) {
    try {
      const response = await axios.get(url, { 
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      });
      
      log('blue', `   ${url}: HTTP ${response.status}`);
      
      if (response.status === 502) {
        log('yellow', `   ⚠️  502 Bad Gateway - Service might be starting or crashed`);
      } else if (response.status === 404) {
        log('yellow', `   ⚠️  404 Not Found - Check Railway domain settings`);
      }
      
    } catch (error) {
      log('red', `   ${url}: ${error.message}`);
    }
  }
}

// Run the discovery
async function main() {
  await checkRailwayInfo();
  const workingUrl = await findWorkingUrl();
  
  if (workingUrl && workingUrl.includes('localhost')) {
    log('yellow', `\n💡 Running locally! To test with production data:`);
    console.log(`   1. Set DATABASE_URL to your production database`);
    console.log(`   2. Or deploy to Railway for production testing`);
  }
}

main().catch(error => {
  log('red', `💥 Discovery failed: ${error.message}`);
  process.exit(1);
});