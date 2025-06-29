const shopeeCouriers = [
  "John Felix Uzon Tabaque",
  "Jauary Mariquez San Juan",
  "Irjie Agudo Rosales",
  "Irish Tabaque Acabo"
];

async function addShopee2WCouriers() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Adding Shopee 2W couriers with rate 15...\n');
  
  for (const courierName of shopeeCouriers) {
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
          shopeeRate: 15,
          type: '2w'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Added Shopee 2W courier: ${courierName}`);
      } else {
        console.log(`❌ Failed to add courier: ${courierName} - ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error adding courier: ${courierName} - ${error.message}`);
    }
  }
  
  console.log('\n✨ Finished adding all Shopee 2W couriers!');
}

addShopee2WCouriers();