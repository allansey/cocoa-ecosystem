const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Test1234!', 10);

  // Upsert test farmer
  const farmer = await prisma.user.upsert({
    where: { email: 'testfarmer@cocoalink.com' },
    update: { password },
    create: {
      name: 'Ama Asante',
      email: 'testfarmer@cocoalink.com',
      password,
      role: 'FARMER',
      phone: '+233 24 000 0001',
    }
  });

  // Upsert test buyer
  const buyer = await prisma.user.upsert({
    where: { email: 'testbuyer@cocoalink.com' },
    update: { password },
    create: {
      name: 'James Owusu',
      email: 'testbuyer@cocoalink.com',
      password,
      role: 'BUYER',
      phone: '+233 24 000 0002',
    }
  });

  console.log('✅ Test accounts ready!');
  console.log('\n🌾 FARMER');
  console.log('   Email:   ', farmer.email);
  console.log('   Password: Test1234!');
  console.log('\n🛒 BUYER');
  console.log('   Email:   ', buyer.email);
  console.log('   Password: Test1234!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
