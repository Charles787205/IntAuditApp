const shopee4WCouriers = [
  "Jason Langtad Gastones",
  "Bernard Joseph Maranga Aben"
];

async function addShopee4WCouriers() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Adding Shopee 4W couriers with rate 20...\n');
  
  for (const courierName of shopee4WCouriers) {
    try {
      const response = await fetch(`${baseUrl}/api/couriers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: courierName,
          isLazada: false,
          isShopee: true,
          lazRate: null,
          shopeeRate: 20,
          type: '4w'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Added Shopee 4W courier: ${courierName}`);
      } else {
        console.log(`❌ Failed to add courier: ${courierName} - ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error adding courier: ${courierName} - ${error.message}`);
    }
  }
  
  console.log('\n✨ Finished adding all Shopee 4W couriers!');
}

addShopee4WCouriers();