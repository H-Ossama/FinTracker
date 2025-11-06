import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default categories
  const categories = [
    { name: 'Food & Dining', icon: 'restaurant', color: '#FF6B6B', isCustom: false },
    { name: 'Shopping', icon: 'shopping-bag', color: '#4ECDC4', isCustom: false },
    { name: 'Transportation', icon: 'car', color: '#45B7D1', isCustom: false },
    { name: 'Bills & Utilities', icon: '🧾', color: '#96CEB4', isCustom: false },
    { name: 'Entertainment', icon: 'tv', color: '#FFEAA7', isCustom: false },
    { name: 'Healthcare', icon: 'medical', color: '#DDA0DD', isCustom: false },
    { name: 'Education', icon: 'school', color: '#98D8C8', isCustom: false },
    { name: 'Salary', icon: 'cash', color: '#6C5CE7', isCustom: false },
    { name: 'Business', icon: 'briefcase', color: '#A29BFE', isCustom: false },
    { name: 'Investment', icon: 'trending-up', color: '#FD79A8', isCustom: false },
    { name: 'Freelance', icon: 'laptop', color: '#74B9FF', isCustom: false },
    { name: 'Gift', icon: 'gift', color: '#E17055', isCustom: false },
    { name: 'Insurance', icon: 'shield', color: '#81ECEC', isCustom: false },
    { name: 'Taxes', icon: 'calculator', color: '#FD79A8', isCustom: false },
    { name: 'Travel', icon: 'airplane', color: '#FDCB6E', isCustom: false },
  ];

  console.log('📂 Creating default categories...');
  for (const category of categories) {
    try {
      await prisma.category.create({
        data: category,
      });
    } catch (e) {
      // Category already exists, skip
    }
  }

  console.log('💱 Creating currency rates...');
  // Add some sample currency rates
  const currencyRates = [
    { baseCurrency: 'USD', targetCurrency: 'EUR', rate: 0.85 },
    { baseCurrency: 'USD', targetCurrency: 'MAD', rate: 10.12 },
    { baseCurrency: 'EUR', targetCurrency: 'USD', rate: 1.18 },
    { baseCurrency: 'EUR', targetCurrency: 'MAD', rate: 11.91 },
    { baseCurrency: 'MAD', targetCurrency: 'USD', rate: 0.099 },
    { baseCurrency: 'MAD', targetCurrency: 'EUR', rate: 0.084 },
  ];

  for (const rate of currencyRates) {
    await prisma.currencyRate.upsert({
      where: {
        baseCurrency_targetCurrency_date: {
          baseCurrency: rate.baseCurrency as any,
          targetCurrency: rate.targetCurrency as any,
          date: new Date(),
        },
      },
      update: { rate: rate.rate },
      create: {
        ...rate,
        baseCurrency: rate.baseCurrency as any,
        targetCurrency: rate.targetCurrency as any,
      },
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });