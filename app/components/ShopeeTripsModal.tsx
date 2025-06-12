import React, { useState, useEffect } from 'react';

interface ShopeeTrip {
  taskId: string;
  driver: string;
  driverStation: string;
  deliveryDate: string;
  pointCode: string;
  town: string;
  preAllocateZoneId: string;
  journeyType: string;
  numberOfOrders: number;
  numberOfAssignedOrders: number;
  operator: string;
  createTime: string;
  assignedTime: string;
  completeTime: string;
  status: string;
  action: string;
}

interface ShopeeDriverSummary {
  driver: string;
  driverId: string;
  tripCount: number;
  totalOrders: number;
  totalAssignedOrders: number;
  trips: ShopeeTrip[];
  vehicleType?: string; // Add vehicle type from database
  inDatabase: boolean; // Track if driver exists in database
}

interface DatabaseCourier {
  id: number;
  name: string;
  type: string; // 2w, 3w, 4w
  isLazada: boolean;
  isShopee: boolean;
  lazRate: number | null;
  shopeeRate: number | null;
}

interface ShopeeTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShopeeTripsModal: React.FC<ShopeeTripsModalProps> = ({ isOpen, onClose }) => {
  const [pastedData, setPastedData] = useState('');
  const [driverSummaries, setDriverSummaries] = useState<ShopeeDriverSummary[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [databaseCouriers, setDatabaseCouriers] = useState<DatabaseCourier[]>([]);
  const [isLoadingCouriers, setIsLoadingCouriers] = useState(false);
  const [missingDrivers, setMissingDrivers] = useState<{name: string, estimatedType: string}[]>([]);

  // Fetch couriers from database when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCouriers();
    }
  }, [isOpen]);

  const fetchCouriers = async () => {
    setIsLoadingCouriers(true);
    try {
      const response = await fetch('/api/couriers');
      const data = await response.json();
      
      if (data.success) {
        console.log('Loaded couriers from database:', data.couriers);
        setDatabaseCouriers(data.couriers);
      } else {
        console.error('Failed to fetch couriers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching couriers:', error);
    } finally {
      setIsLoadingCouriers(false);
    }
  };

  // Function to estimate vehicle type based on driver name patterns
  const estimateVehicleType = (driverName: string): string => {
    const name = driverName.toLowerCase();
    
    // Common 2-wheel indicators (motorcycles/bikes)
    if (name.includes('bike') || name.includes('motor') || name.includes('scooter')) {
      return '2w';
    }
    
    // Common 4-wheel indicators (vans/cars)
    if (name.includes('van') || name.includes('truck') || name.includes('car')) {
      return '4w';
    }
    
    // Default assumption - most Shopee riders use motorcycles (2w)
    return '2w';
  };

  const parseShopeeData = (data: string): ShopeeTrip[] => {
    const lines = data.trim().split('\n').filter(line => line.trim());
    const trips: ShopeeTrip[] = [];

    console.log('Total lines:', lines.length);

    // Database courier names for matching
    const dbCourierNames = databaseCouriers.map(c => c.name.toUpperCase().trim());
    
    // Shopee driver names to match against (updated list with Kevin)
    const shopeeDrivers = [
      'John Felix Uzon Tabaque',
      'Jauary Mariquez San Juan', 
      'Irjie Agudo Rosales',
      'Irish Tabaque Acabo',
      'Jason Langtad Gastones',
      'Bernard Joseph Maranga Aben',
      'Mark Himarangan Guillermo',
      'Jerome Lariosa Caballero',
      'Nelgie Segador Mahipos',
      'Aljer Diaz Orgel',
      'Bobster Rotor Luzarito',
      'Kevin Mamada Maloyo' // Added Kevin
    ];

    // Combine database courier names with fallback list
    const allDriverNames = [...new Set([
      ...dbCourierNames,
      ...shopeeDrivers.map(name => name.toUpperCase().trim())
    ])];

    // Improved parsing logic for Shopee data
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line contains a driver name with ID format: [ID] Name
      // Look for pattern [numbers] followed by any driver name
      const driverMatch = line.match(/\[(\d+)\]\s*(.+)/);
      
      if (driverMatch) {
        const driverId = driverMatch[1];
        const driverNamePart = driverMatch[2].trim();
        
        // Check if this driver name matches any of our known drivers
        const matchedDriver = allDriverNames.find(name => 
          name.includes(driverNamePart.toUpperCase()) || 
          driverNamePart.toUpperCase().includes(name)
        ) || shopeeDrivers.find(shopeeDriver => 
          line.includes(shopeeDriver) || shopeeDriver.toLowerCase().includes(driverNamePart.toLowerCase())
        );
        
        if (matchedDriver || shopeeDrivers.some(driver => line.includes(driver))) {
          const actualDriverName = matchedDriver || shopeeDrivers.find(driver => line.includes(driver)) || driverNamePart;
          console.log(`Found Shopee driver: ${actualDriverName} at line ${i}`);
          console.log(`Full line: ${line}`);
          console.log(`Driver ID: ${driverId}`);
          
          let taskId = '';
          let driverStation = '';
          let deliveryDate = '';
          let pointCode = '';
          let town = '';
          let preAllocateZoneId = '';
          let journeyType = '';
          let numberOfOrders = 0;
          let numberOfAssignedOrders = 0;
          let operator = '';
          let createTime = '';
          let assignedTime = '';
          let completeTime = '';
          let status = '';
          let action = '';
          
          // Look for the assignment data in the lines around the driver
          // Find the task ID (should be before the driver line)
          for (let j = i - 5; j <= i + 5; j++) {
            if (j >= 0 && j < lines.length) {
              const checkLine = lines[j].trim();
              if (/^AT\d+[A-Z0-9]+$/.test(checkLine)) {
                taskId = checkLine;
                
                // Now we know the structure, extract all fields relative to task ID position
                const taskLineIndex = j;
                
                if (taskLineIndex + 1 < lines.length) driverStation = lines[taskLineIndex + 2]?.trim() || '';
                if (taskLineIndex + 3 < lines.length) deliveryDate = lines[taskLineIndex + 3]?.trim() || '';
                if (taskLineIndex + 4 < lines.length) pointCode = lines[taskLineIndex + 4]?.trim() || '';
                if (taskLineIndex + 5 < lines.length) town = lines[taskLineIndex + 5]?.trim() || '';
                if (taskLineIndex + 6 < lines.length) preAllocateZoneId = lines[taskLineIndex + 6]?.trim() || '';
                if (taskLineIndex + 7 < lines.length) journeyType = lines[taskLineIndex + 7]?.trim() || '';
                if (taskLineIndex + 8 < lines.length) {
                  const ordersLine = lines[taskLineIndex + 8]?.trim() || '0';
                  numberOfOrders = parseInt(ordersLine) || 0;
                }
                if (taskLineIndex + 9 < lines.length) {
                  const assignedLine = lines[taskLineIndex + 9]?.trim() || '0';
                  numberOfAssignedOrders = parseInt(assignedLine) || 0;
                }
                if (taskLineIndex + 10 < lines.length) operator = lines[taskLineIndex + 10]?.trim() || '';
                if (taskLineIndex + 11 < lines.length) createTime = lines[taskLineIndex + 11]?.trim() || '';
                if (taskLineIndex + 12 < lines.length) assignedTime = lines[taskLineIndex + 12]?.trim() || '';
                if (taskLineIndex + 13 < lines.length) completeTime = lines[taskLineIndex + 13]?.trim() || '';
                if (taskLineIndex + 14 < lines.length) status = lines[taskLineIndex + 14]?.trim() || '';
                if (taskLineIndex + 15 < lines.length) action = lines[taskLineIndex + 15]?.trim() || '';
                
                break;
              }
            }
          }
          
          console.log(`Task ID: ${taskId}`);
          console.log(`Driver: ${actualDriverName} (ID: ${driverId})`);
          console.log(`Orders: ${numberOfOrders}, Assigned: ${numberOfAssignedOrders}`);
          console.log(`Status: ${status}`);
          
          if (taskId) {
            const trip: ShopeeTrip = {
              taskId: taskId,
              driver: line,
              driverStation: driverStation,
              deliveryDate: deliveryDate,
              pointCode: pointCode,
              town: town,
              preAllocateZoneId: preAllocateZoneId,
              journeyType: journeyType,
              numberOfOrders: numberOfOrders,
              numberOfAssignedOrders: numberOfAssignedOrders,
              operator: operator,
              createTime: createTime,
              assignedTime: assignedTime,
              completeTime: completeTime,
              status: status,
              action: action
            };

            trips.push(trip);
            console.log('Created Shopee trip:', trip);
          }
        }
      }
    }

    console.log('Total Shopee trips parsed:', trips.length);
    return trips;
  };

  const aggregateByDriver = (trips: ShopeeTrip[]): ShopeeDriverSummary[] => {
    const driverMap = new Map<string, ShopeeDriverSummary>();
    const foundMissingDrivers: {name: string, estimatedType: string}[] = [];

    trips.forEach(trip => {
      // Use just the driver name (without ID) as the key for proper aggregation
      const cleanDriverName = trip.driver.replace(/\[\d+\]\s*/, '').trim();
      const key = cleanDriverName;
      
      // Find driver in database
      const dbCourier = findCourierByName(cleanDriverName);
      const vehicleType = dbCourier?.type || estimateVehicleType(cleanDriverName);
      const inDatabase = !!dbCourier;
      
      // Track missing drivers
      if (!inDatabase) {
        const existingMissing = foundMissingDrivers.find(m => m.name === cleanDriverName);
        if (!existingMissing) {
          foundMissingDrivers.push({
            name: cleanDriverName,
            estimatedType: vehicleType
          });
        }
      }
      
      if (driverMap.has(key)) {
        const summary = driverMap.get(key)!;
        summary.tripCount++;
        summary.totalOrders += trip.numberOfOrders;
        summary.totalAssignedOrders += trip.numberOfAssignedOrders;
        summary.trips.push(trip);
      } else {
        // Extract driver ID from first trip
        const driverIdMatch = trip.driver.match(/\[(\d+)\]/);
        const driverId = driverIdMatch ? driverIdMatch[1] : '';
        
        driverMap.set(key, {
          driver: cleanDriverName,
          driverId: driverId,
          tripCount: 1,
          totalOrders: trip.numberOfOrders,
          totalAssignedOrders: trip.numberOfAssignedOrders,
          vehicleType,
          inDatabase,
          trips: [trip]
        });
      }
    });

    setMissingDrivers(foundMissingDrivers);

    // Sort by vehicle type, then by driver name
    return Array.from(driverMap.values()).sort((a, b) => {
      // First sort by vehicle type (4w first, then 2w)
      const typeOrder = { '4w': 0, '3w': 1, '2w': 2 };
      const aTypeOrder = typeOrder[a.vehicleType as keyof typeof typeOrder] ?? 3;
      const bTypeOrder = typeOrder[b.vehicleType as keyof typeof typeOrder] ?? 3;
      
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder;
      }
      
      // Then sort by driver name
      return a.driver.localeCompare(b.driver);
    });
  };

  // Helper function to find courier by name with fuzzy matching
  const findCourierByName = (shopeeDriverName: string) => {
    const cleanName = shopeeDriverName.replace(/\[\d+\]\s*/, '').trim();
    
    // First try exact match
    let courier = databaseCouriers.find(c => c.name === cleanName);
    if (courier) return courier;
    
    // Try case-insensitive match
    courier = databaseCouriers.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (courier) return courier;
    
    // Try partial matches (for cases where names might be slightly different)
    courier = databaseCouriers.find(c => {
      const courierNameWords = c.name.toLowerCase().split(' ');
      const shopeeNameWords = cleanName.toLowerCase().split(' ');
      
      // Check if at least 2 words match (for names with 3+ words)
      const matchingWords = courierNameWords.filter(word => 
        shopeeNameWords.some(shopeeWord => shopeeWord.includes(word) || word.includes(shopeeWord))
      );
      
      return matchingWords.length >= Math.min(2, courierNameWords.length);
    });
    
    return courier;
  };

  // Helper function to get vehicle type
  const getVehicleType = (name: string): string => {
    const courier = findCourierByName(name);
    if (courier) {
      console.log(`Found courier: ${name} -> ${courier.name} (${courier.type})`);
      return courier.type.toUpperCase();
    }
    console.log(`Courier not found: ${name}, defaulting to 2W`);
    return '2W'; // Default to 2W if not found in database
  };

  const handleProcessData = () => {
    if (!pastedData.trim()) return;

    const trips = parseShopeeData(pastedData);
    console.log('Parsed Shopee trips:', trips);
    const summaries = aggregateByDriver(trips);
    console.log('Driver summaries:', summaries);
    setDriverSummaries(summaries);
    setShowResults(true);
  };

  const handleReset = () => {
    setPastedData('');
    setDriverSummaries([]);
    setShowResults(false);
    setMissingDrivers([]);
  };

  const copyTotalOrders = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = driverSummaries.filter(d => d.vehicleType === '4w');
    const threeWheelers = driverSummaries.filter(d => d.vehicleType === '3w');
    const twoWheelers = driverSummaries.filter(d => d.vehicleType === '2w');
    
    let totalOrdersText = '';
    
    // Add 4-wheelers
    if (fourWheelers.length > 0) {
      totalOrdersText += fourWheelers.map(summary => summary.totalOrders).join('\n');
    }
    
    // Add spacing between 4w and 3w/2w
    if (fourWheelers.length > 0 && (threeWheelers.length > 0 || twoWheelers.length > 0)) {
      totalOrdersText += '\n\n';
    }
    
    // Add 3-wheelers
    if (threeWheelers.length > 0) {
      totalOrdersText += threeWheelers.map(summary => summary.totalOrders).join('\n');
    }
    
    // Add spacing between 3w and 2w
    if (threeWheelers.length > 0 && twoWheelers.length > 0) {
      totalOrdersText += '\n\n';
    }
    
    // Add 2-wheelers
    if (twoWheelers.length > 0) {
      totalOrdersText += twoWheelers.map(summary => summary.totalOrders).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(totalOrdersText);
      alert('Total orders copied to clipboard with vehicle type spacing!');
    } catch (error) {
      console.error('Failed to copy total orders:', error);
      alert('Failed to copy total orders to clipboard');
    }
  };

  const copyDriverNames = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = driverSummaries.filter(d => d.vehicleType === '4w');
    const threeWheelers = driverSummaries.filter(d => d.vehicleType === '3w');
    const twoWheelers = driverSummaries.filter(d => d.vehicleType === '2w');
    
    let driverNamesText = '';
    
    // Add 4-wheelers
    if (fourWheelers.length > 0) {
      driverNamesText += fourWheelers.map(summary => summary.driver).join('\n');
    }
    
    // Add spacing between 4w and 3w/2w
    if (fourWheelers.length > 0 && (threeWheelers.length > 0 || twoWheelers.length > 0)) {
      driverNamesText += '\n\n';
    }
    
    // Add 3-wheelers
    if (threeWheelers.length > 0) {
      driverNamesText += threeWheelers.map(summary => summary.driver).join('\n');
    }
    
    // Add spacing between 3w and 2w
    if (threeWheelers.length > 0 && twoWheelers.length > 0) {
      driverNamesText += '\n\n';
    }
    
    // Add 2-wheelers
    if (twoWheelers.length > 0) {
      driverNamesText += twoWheelers.map(summary => summary.driver).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(driverNamesText);
      alert('Driver names copied to clipboard with vehicle type spacing!');
    } catch (error) {
      console.error('Failed to copy driver names:', error);
      alert('Failed to copy driver names to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Shopee Trips Analysis</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!showResults ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Paste your Shopee assignment data here:
                </label>
                <textarea
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder="Paste your Shopee assignment table data here..."
                  className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-md 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleProcessData}
                  disabled={!pastedData.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md 
                           disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed 
                           transition-colors"
                >
                  Process Data
                </button>
                <button
                  onClick={handleReset}
                  className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Driver Summary</h3>
                <div className="flex gap-3">
                  <button
                    onClick={copyDriverNames}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    📋 Copy Names
                  </button>
                  <button
                    onClick={copyTotalOrders}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    📦 Copy Orders
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Process New Data
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-400">Total Drivers</h4>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{driverSummaries.length}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-green-800 dark:text-green-400">Total Trips</h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {driverSummaries.reduce((sum, d) => sum + d.tripCount, 0)}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-400">Total Orders</h4>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {driverSummaries.reduce((sum, d) => sum + d.totalOrders, 0)}
                  </p>
                </div>
              </div>

              {/* Vehicle Type Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-400 mb-2">4-Wheeler Drivers</h4>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {driverSummaries.filter(d => d.vehicleType === '4w').length}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Total Orders: {driverSummaries.filter(d => d.vehicleType === '4w').reduce((sum, d) => sum + d.totalOrders, 0)}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">2-Wheeler Riders</h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {driverSummaries.filter(d => d.vehicleType === '2w').length}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Total Orders: {driverSummaries.filter(d => d.vehicleType === '2w').reduce((sum, d) => sum + d.totalOrders, 0)}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-red-800 dark:text-red-400 mb-2">Missing from Database</h4>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {driverSummaries.filter(d => !d.inDatabase).length}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Need to be added
                  </p>
                </div>
              </div>

              {/* Orders Summary */}
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/20 rounded-lg border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-800 dark:text-slate-300 mb-2">Orders Distribution Summary</h4>
                <p className="text-lg text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-purple-600 dark:text-purple-400">4W</span> - {driverSummaries.filter(d => d.vehicleType === '4w').reduce((sum, d) => sum + d.totalOrders, 0).toLocaleString()} orders | 
                  <span className="font-bold text-green-600 dark:text-green-400 ml-2">2W</span> - {driverSummaries.filter(d => d.vehicleType === '2w').reduce((sum, d) => sum + d.totalOrders, 0).toLocaleString()} orders
                </p>
              </div>

              {/* Driver Details Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Driver Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Vehicle Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Database Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Driver ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Trip Count
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Total Orders
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {driverSummaries.map((summary, index) => (
                      <tr key={index} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                        !summary.inDatabase ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                      }`}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                          <div className="flex items-center space-x-2">
                            <span>{summary.driver}</span>
                            {!summary.inDatabase && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                                ⚠️ Missing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            summary.vehicleType === '4w' 
                              ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400'
                              : summary.vehicleType === '3w'
                              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                              : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                          }`}>
                            🚗 {summary.vehicleType?.toUpperCase() || '2W'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            summary.inDatabase
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                          }`}>
                            {summary.inDatabase ? '✅ In DB' : '❌ Missing'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          {summary.driverId}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                            {summary.tripCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className="font-semibold text-slate-900 dark:text-white">{summary.totalOrders}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Missing Drivers Notification */}
              {missingDrivers.length > 0 && (
                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
                    Missing Drivers Notification
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                    The following drivers were not found in the database. Please check the names and add them to the database if necessary:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {missingDrivers.map((driver, index) => (
                      <li key={index} className="text-slate-900 dark:text-white">
                        {driver.name} - Estimated Vehicle Type: <span className="font-semibold">{driver.estimatedType}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopeeTripsModal;