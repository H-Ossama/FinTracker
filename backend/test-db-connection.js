const { PrismaClient } = require('@prisma/client');

// Test the corrected database connection
const testDatabaseConnection = async () => {
  console.log('🔍 Testing Database Connection...\n');
  
  // Original connection string (problematic)
  const originalUrl = "postgresql://neondb_owner:npg_T9aMErmswlG5@ep-divine-field-agawkom9-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  
  // Corrected connection string (recommended)
  const correctedUrl = "postgresql://neondb_owner:npg_T9aMErmswlG5@ep-divine-field-agawkom9-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";
  
  // Alternative connection string (if above fails)
  const alternativeUrl = "postgresql://neondb_owner:npg_T9aMErmswlG5@ep-divine-field-agawkom9-pooler.c-2.eu-central-1.aws.neon.tech/neondb";
  
  const testConnection = async (url, name) => {
    console.log(`📡 Testing ${name}...`);
    try {
      const prisma = new PrismaClient({
        datasources: {
          db: { url }
        }
      });
      
      await prisma.$connect();
      console.log(`✅ ${name}: Connected successfully`);
      
      // Test a simple query
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log(`✅ ${name}: Query test passed`);
      
      // Check if tables exist
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      
      console.log(`✅ ${name}: Found ${tables.length} tables`);
      if (tables.length > 0) {
        console.log(`   Tables: ${tables.slice(0, 3).map(t => t.table_name).join(', ')}${tables.length > 3 ? '...' : ''}`);
      }
      
      await prisma.$disconnect();
      return true;
      
    } catch (error) {
      console.log(`❌ ${name}: Failed`);
      console.log(`   Error: ${error.message}`);
      return false;
    }
  };
  
  console.log('Testing different connection string formats:\n');
  
  // Test corrected URL first (most likely to work)
  const correctedWorks = await testConnection(correctedUrl, 'Corrected URL (Recommended)');
  
  if (correctedWorks) {
    console.log('\n🎉 Use the corrected URL in Railway!');
    console.log('\n📋 Copy this to Railway DATABASE_URL:');
    console.log(correctedUrl);
    return;
  }
  
  // Test alternative URL if corrected fails
  const alternativeWorks = await testConnection(alternativeUrl, 'Alternative URL (No SSL)');
  
  if (alternativeWorks) {
    console.log('\n🎉 Use the alternative URL in Railway!');
    console.log('\n📋 Copy this to Railway DATABASE_URL:');
    console.log(alternativeUrl);
    return;
  }
  
  // Test original URL for comparison
  await testConnection(originalUrl, 'Original URL (Problematic)');
  
  console.log('\n❌ All connection attempts failed.');
  console.log('\n🔧 Troubleshooting suggestions:');
  console.log('1. Check if the Neon database is running');
  console.log('2. Verify the username and password are correct');
  console.log('3. Check if the database allows connections from Railway IP ranges');
  console.log('4. Try connecting with a simpler connection string');
};

testDatabaseConnection().catch(error => {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
});