const { PrismaClient } = require('@prisma/client');

// Singleton pattern for serverless environments
let prisma;

if (!global.prisma) {
  global.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty'
  });
}

prisma = global.prisma;

// Example usage function (similar to your provided example)
async function testConnection() {
  try {
    console.log('Testing Prisma connection...');
    // Test with a simple query - get first user or create a test record
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users in database`);
    
    // Example: Create a test benefit if none exist
    if (userCount === 0) {
      console.log('No users found, database might be empty. Run: npm run prisma:seed');
    }
    
    return true;
  } catch (err) {
    console.error("Error executing query:", err);
    return false;
  }
}

// Handle graceful shutdown (only in non-serverless environments)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });

  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

module.exports = { prisma, testConnection };
