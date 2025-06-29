const { PrismaClient } = require('./app/generated/prisma');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('=== Checking Database Contents ===');
    
    // Check total parcels
    const totalParcels = await prisma.parcel.count();
    console.log(`Total parcels: ${totalParcels}`);
    
    // Check total handovers
    const totalHandovers = await prisma.handover.count();
    console.log(`Total handovers: ${totalHandovers}`);
    
    // Check Shopee handovers specifically
    const shopeeHandovers = await prisma.handover.count({
      where: { type: 'shopee' }
    });
    console.log(`Shopee handovers: ${shopeeHandovers}`);
    
    // Check parcels with Shopee handovers
    const parcelsWithShopeeHandovers = await prisma.parcel.count({
      where: {
        handover: {
          type: 'shopee'
        }
      }
    });
    console.log(`Parcels with Shopee handovers: ${parcelsWithShopeeHandovers}`);
    
    // Get sample Shopee handovers
    const sampleShopeeHandovers = await prisma.handover.findMany({
      where: { type: 'shopee' },
      take: 3,
      include: {
        parcels: {
          take: 2
        }
      }
    });
    console.log('\nSample Shopee handovers:');
    console.log(JSON.stringify(sampleShopeeHandovers, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
