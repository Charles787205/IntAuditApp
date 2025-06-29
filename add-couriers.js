const couriers = [
  "THERESE ANGELIE SILVERIO VALENCIA",
  "JESTONI ALIVIADO EROT",
  "JEILEBER BAQUILO RASONABLE",
  "GERMAN SISON VELOZ",
  "JEFFREY MESA GIRAO",
  "RHENO PLAYDA CANGAS",
  "LUTHER MONDIDO DOWING JR",
  "GADDY LOVENDINO MIRABEL",
  "MARK HIMARANGAN GUILLERMO",
  "LORDAN JOHN FELISAN TEOFILO",
  "ROY LEMUEL VICTORIANO GASTAR",
  "LARRY GLENN ASIMAN ARENO",
  "JEROME LARIOSA CABALLERO",
  "LEA LAUDE DECENA"
];

async function addCouriers() {
  const baseUrl = 'http://localhost:3000'; // Updated to use port 3000
  
  for (const courierName of couriers) {
    try {
      const response = await fetch(`${baseUrl}/api/couriers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: courierName,
          isLazada: true,
          isShopee: false,
          lazRate: 18,
          shopeeRate: null,
          type: '4w'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Added courier: ${courierName}`);
      } else {
        console.log(`❌ Failed to add courier: ${courierName} - ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error adding courier: ${courierName} - ${error.message}`);
    }
  }
  
  console.log('\n✨ Finished adding all couriers!');
}

addCouriers();