const newCouriers = [
  "BEMART CERDO PASCUAL",
  "JOMAR GEALON TIZON",
  "NESTOR ALFORNON SOLLANO JR",
  "RYAN MASINAPOC TAYA",
  "DENNIS ALAYON PILLADO",
  "NELGIE SEGADOR MAHIPOS",
  "JEFFREY BALLEDARES PALANG-AT",
  "ADECEL RABINO",
  "MICHAEL ANGELOU GIENTE LABARETTE",
  "JAIME BILLON PUSTA JR",
  "MARVIEN GATUANGCO ANDO",
  "PERRY ESMAEL MEDJI",
  "CHRISTIAN ALFERES",
  "GENE CLAUDE GARCIA BUTIONG",
  "REYMUND JUN GALVEZ TAN-PUA",
  "JULLUS RHAY ARMAMENTO TOME",
  "ROMER FERNANDEZ CASTRO",
  "ARNOLD MESA GIRAO"
];

async function addLazada2WCouriers() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Adding Lazada 2W couriers with rate 14...\n');
  
  for (const courierName of newCouriers) {
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
          lazRate: 14,
          shopeeRate: null,
          type: '2w'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Added 2W courier: ${courierName}`);
      } else {
        console.log(`❌ Failed to add courier: ${courierName} - ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error adding courier: ${courierName} - ${error.message}`);
    }
  }
  
  console.log('\n✨ Finished adding all Lazada 2W couriers!');
}

addLazada2WCouriers();