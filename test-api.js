const { PrismaClient } = require('./app/generated/prisma');

const prisma = new PrismaClient();

async function testApiQuery() {
  try {
    console.log('=== Testing API Query Logic ===');
    
    // This mimics what the API does when platform=shopee is passed
    const where = {
      handover: {
        type: 'shopee' // Use type field instead of platform
      }
    };
    
    console.log('Query where clause:', JSON.stringify(where, null, 2));
    
    // Test the query
    const parcels = await prisma.parcel.findMany({
      where,
      take: 5,
      include: {
        handover: {
          select: {
            id: true,
            file_name: true,
            handover_date: true,
            status: true,
            platform: true,
            type: true
          }
        }
      }
    });
    
    console.log(`Found ${parcels.length} Shopee parcels`);
    console.log('Sample parcels:', JSON.stringify(parcels, null, 2));
    
    // Also test getting total count
    const totalCount = await prisma.parcel.count({ where });
    console.log(`Total Shopee parcels: ${totalCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApiQuery();
