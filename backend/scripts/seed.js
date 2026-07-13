const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Check if we already have listings
  const existingListings = await prisma.listing.count();
  if (existingListings > 0) {
    console.log('Database already seeded with listings.');
    return;
  }

  // Create a mock farmer
  const hashedPassword = await bcrypt.hash('password123', 10);
  const farmer = await prisma.user.create({
    data: {
      email: 'farmer@cocoalink.com',
      password: hashedPassword,
      name: 'Kwame Mensah',
      role: 'FARMER',
      phone: '+233 55 123 4567'
    }
  });

  // Create some mock listings
  await prisma.listing.createMany({
    data: [
      {
        grade: 'Premium Grade A',
        quantityKg: 1000,
        priceGhsPerTonne: 35500,
        region: 'Ashanti',
        farmerId: farmer.id,
      },
      {
        grade: 'Standard Grade',
        quantityKg: 500,
        priceGhsPerTonne: 34000,
        region: 'Western',
        farmerId: farmer.id,
      },
      {
        grade: 'Organic Premium',
        quantityKg: 2000,
        priceGhsPerTonne: 38000,
        region: 'Eastern',
        farmerId: farmer.id,
      }
    ]
  });

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
