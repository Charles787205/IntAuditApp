import React, { useState, useEffect } from 'react';

interface Trip {
  runsheet: string;
  courier: string;
  courierId: string;
  helperCheckIn: string;
  type: string;
  total: number;
  successful: number;
  failed: number;
  checkedInParcels: string;
  dispatched: string;
  checkInStatus: string;
  action: string;
}

interface CourierSummary {
  courier: string;
  courierId: string;
  tripCount: number;
  totalParcels: number;
  totalSuccessful: number;
  totalFailed: number;
  trips: Trip[];
  vehicleType?: string; // Add vehicle type from database
  inDatabase: boolean; // Track if courier exists in database
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

interface CourierTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CourierTripsModal: React.FC<CourierTripsModalProps> = ({ isOpen, onClose }) => {
  const [pastedData, setPastedData] = useState('');
  const [courierSummaries, setCourierSummaries] = useState<CourierSummary[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [databaseCouriers, setDatabaseCouriers] = useState<DatabaseCourier[]>([]);
  const [isLoadingCouriers, setIsLoadingCouriers] = useState(false);
  const [missingCouriers, setMissingCouriers] = useState<{name: string, estimatedType: string}[]>([]);

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

  // Function to estimate vehicle type based on courier name patterns
  const estimateVehicleType = (courierName: string): string => {
    // You can add more sophisticated logic here based on naming patterns
    // For now, we'll make educated guesses based on common patterns
    const name = courierName.toLowerCase();
    
    // Common 2-wheel indicators (motorcycles/bikes)
    if (name.includes('bike') || name.includes('motor') || name.includes('scooter')) {
      return '2w';
    }
    
    // Common 4-wheel indicators (vans/cars)
    if (name.includes('van') || name.includes('truck') || name.includes('car')) {
      return '4w';
    }
    
    // Default assumption based on typical delivery patterns
    // Most individual couriers use motorcycles (2w)
    return '2w';
  };

  const parseTableData = (data: string): Trip[] => {
    const lines = data.trim().split('\n').filter(line => line.trim());
    const trips: Trip[] = [];

    console.log('Total lines:', lines.length);

    // Build courier names from database for better matching
    const dbCourierNames = databaseCouriers.map(c => c.name.toUpperCase().trim());
    
    // Original hardcoded list as fallback
    const fallbackCourierNames = [
      'MARK HIMARANGAN GUILLERMO', 'JULLUS RHAY ARMAMENTO TOME', 'ROMER FERNANDEZ CASTRO',
      'LEA LAUDE DECENA', 'JEILEBER BAQUILO RASONABLE', 'THERESE ANGELIE SILVERIO VALENCIA',
      'JAIME BILLON PUSTA JR', 'RYAN MASINAPOC TAYA', 'JEFFREY MESA GIRAO',
      'JEROME LARIOSA CABALLERO', 'ROY LEMUEL VICTORIANO GASTAR', 'RHENO PLAYDA CANGAS',
      'LUTHER MONDIDO DOWING JR', 'JOMAR GEALON TIZON', 'GERMAN SISON VELOZ',
      'JESTONI ALIVIADO EROT', 'DENNIS ALAYON PILLADO', 'CHRISTIAN ALFERES',
      'JEFFREY BALLEDARES PALANG-AT', 'ADECEL RABINO', 'REYMUND JUN GALVEZ TAN-PUA',
      'NELGIE SEGADOR MAHIPOS', 'ARNOLD MESA GIRAO', 'LARRY GLENN ASIMAN ARENO',
      'MARVIEN GATUANGCO ANDO', 'PERRY ESMAEL MEDJI', 'BEMART CERDO PASCUAL',
      'NESTOR ALFORNON SOLLANO JR', 'MICHAEL ANGELOU GIENTE LABARETTE',
      'GENE CLAUDE GARCIA BUTIONG', 'LORDAN JOHN FELISAN TEOFILO'
    ];

    // Combine database courier names with fallback list
    const allCourierNames = [...new Set([...dbCourierNames, ...fallbackCourierNames])];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      
      // Check if this line matches a courier name
      const matchedCourier = allCourierNames.find(name => line === name);
      
      if (matchedCourier) {
        console.log(`Found courier: ${matchedCourier} at line ${i}`);
        
        // Get the runsheet ID (should be the line before the courier name)
        const runsheetId = i > 0 ? lines[i - 1].trim() : '';
        
        // Get courier ID (should be the line after courier name)
        const courierId = i + 1 < lines.length ? lines[i + 1].trim() : '';
        
        // Get total parcels (4 lines after courier name)
        const totalParcels = i + 4 < lines.length ? parseInt(lines[i + 4].trim()) || 0 : 0;
        
        // Get successful (5 lines after courier name)
        const successful = i + 5 < lines.length ? parseInt(lines[i + 5].trim()) || 0 : 0;
        
        // Get failed (6 lines after courier name)
        const failed = i + 6 < lines.length ? parseInt(lines[i + 6].trim()) || 0 : 0;
        
        // Get delivery type (3 lines after courier name)
        const deliveryType = i + 3 < lines.length ? lines[i + 3].trim() : 'Delivery';
        
        console.log(`Courier: ${matchedCourier}, Total: ${totalParcels}, Successful: ${successful}, Failed: ${failed}`);
        
        const trip: Trip = {
          runsheet: runsheetId,
          courier: matchedCourier,
          courierId: courierId,
          helperCheckIn: '-',
          type: deliveryType,
          total: totalParcels,
          successful: successful,
          failed: failed,
          checkedInParcels: '0 / 0',
          dispatched: '',
          checkInStatus: 'Pending',
          action: ''
        };

        trips.push(trip);
        console.log('Created trip:', trip);
      }
    }

    console.log('Total trips parsed:', trips.length);
    return trips;
  };

  const aggregateByCourier = (trips: Trip[]): CourierSummary[] => {
    const courierMap = new Map<string, CourierSummary>();
    const foundMissingCouriers: {name: string, estimatedType: string}[] = [];

    trips.forEach(trip => {
      // Skip trips with 0 total parcels - these shouldn't be included
      if (trip.total === 0) {
        console.log(`Skipping trip with 0 parcels: ${trip.courier}`);
        return;
      }

      const key = `${trip.courier}-${trip.courierId}`;
      
      // Find courier in database - but don't filter out if not found
      const dbCourier = databaseCouriers.find(c => 
        c.name.toUpperCase().trim() === trip.courier.toUpperCase().trim()
      );
      
      const vehicleType = dbCourier?.type || estimateVehicleType(trip.courier);
      const inDatabase = !!dbCourier;
      
      // Track missing couriers for notification
      if (!inDatabase) {
        const existingMissing = foundMissingCouriers.find(m => m.name === trip.courier);
        if (!existingMissing) {
          foundMissingCouriers.push({
            name: trip.courier,
            estimatedType: vehicleType
          });
        }
      }
      
      if (courierMap.has(key)) {
        const summary = courierMap.get(key)!;
        summary.tripCount++;
        summary.totalParcels += trip.total;
        summary.totalSuccessful += trip.successful;
        summary.totalFailed += trip.failed;
        summary.trips.push(trip);
      } else {
        courierMap.set(key, {
          courier: trip.courier,
          courierId: trip.courierId,
          tripCount: 1,
          totalParcels: trip.total,
          totalSuccessful: trip.successful,
          totalFailed: trip.failed,
          vehicleType,
          inDatabase,
          trips: [trip]
        });
      }
    });

    setMissingCouriers(foundMissingCouriers);

    // Convert to array and filter out any remaining entries with 0 totals
    const summaries = Array.from(courierMap.values()).filter(summary => 
      summary.totalParcels > 0
    );

    // Sort by vehicle type, then by courier name
    return summaries.sort((a, b) => {
      // First sort by vehicle type (4w first, then 2w)
      const typeOrder = { '4w': 0, '3w': 1, '2w': 2 };
      const aTypeOrder = typeOrder[a.vehicleType as keyof typeof typeOrder] ?? 3;
      const bTypeOrder = typeOrder[b.vehicleType as keyof typeof typeOrder] ?? 3;
      
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder;
      }
      
      // Then sort by courier name
      return a.courier.localeCompare(b.courier);
    });
  };

  const handleProcessData = () => {
    if (!pastedData.trim()) return;

    const trips = parseTableData(pastedData);
    console.log('Parsed trips:', trips);
    const summaries = aggregateByCourier(trips);
    console.log('Courier summaries:', summaries);
    setCourierSummaries(summaries);
    setShowResults(true);
  };

  const handleReset = () => {
    setPastedData('');
    setCourierSummaries([]);
    setShowResults(false);
  };

  const copyTotalParcels = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = courierSummaries.filter(c => c.vehicleType === '4w');
    const threeWheelers = courierSummaries.filter(c => c.vehicleType === '3w');
    const twoWheelers = courierSummaries.filter(c => c.vehicleType === '2w');
    
    let totalParcelsText = '';
    
    // Add 4-wheelers
    if (fourWheelers.length > 0) {
      totalParcelsText += fourWheelers.map(summary => summary.totalParcels).join('\n');
    }
    
    // Add spacing between 4w and 3w/2w
    if (fourWheelers.length > 0 && (threeWheelers.length > 0 || twoWheelers.length > 0)) {
      totalParcelsText += '\n\n';
    }
    
    // Add 3-wheelers
    if (threeWheelers.length > 0) {
      totalParcelsText += threeWheelers.map(summary => summary.totalParcels).join('\n');
    }
    
    // Add spacing between 3w and 2w
    if (threeWheelers.length > 0 && twoWheelers.length > 0) {
      totalParcelsText += '\n\n';
    }
    
    // Add 2-wheelers
    if (twoWheelers.length > 0) {
      totalParcelsText += twoWheelers.map(summary => summary.totalParcels).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(totalParcelsText);
      alert('Total parcels copied to clipboard with vehicle type spacing!');
    } catch (error) {
      console.error('Failed to copy total parcels:', error);
      alert('Failed to copy total parcels to clipboard');
    }
  };

  const copyCourierNames = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = courierSummaries.filter(c => c.vehicleType === '4w');
    const threeWheelers = courierSummaries.filter(c => c.vehicleType === '3w');
    const twoWheelers = courierSummaries.filter(c => c.vehicleType === '2w');
    
    let courierNamesText = '';
    
    // Add 4-wheelers
    if (fourWheelers.length > 0) {
      courierNamesText += fourWheelers.map(summary => summary.courier).join('\n');
    }
    
    // Add spacing between 4w and 3w/2w
    if (fourWheelers.length > 0 && (threeWheelers.length > 0 || twoWheelers.length > 0)) {
      courierNamesText += '\n\n';
    }
    
    // Add 3-wheelers
    if (threeWheelers.length > 0) {
      courierNamesText += threeWheelers.map(summary => summary.courier).join('\n');
    }
    
    // Add spacing between 3w and 2w
    if (threeWheelers.length > 0 && twoWheelers.length > 0) {
      courierNamesText += '\n\n';
    }
    
    // Add 2-wheelers
    if (twoWheelers.length > 0) {
      courierNamesText += twoWheelers.map(summary => summary.courier).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(courierNamesText);
      alert('Courier names copied to clipboard with vehicle type spacing!');
    } catch (error) {
      console.error('Failed to copy courier names:', error);
      alert('Failed to copy courier names to clipboard');
    }
  };

  const copyCourierNamesWithTypes = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = courierSummaries.filter(c => c.vehicleType === '4w');
    const threeWheelers = courierSummaries.filter(c => c.vehicleType === '3w');
    const twoWheelers = courierSummaries.filter(c => c.vehicleType === '2w');
    
    let courierNamesText = '';
    
    // Add 4-wheelers with type
    if (fourWheelers.length > 0) {
      courierNamesText += fourWheelers.map(summary => `${summary.courier} (4W)`).join('\n');
    }
    
    // Add spacing between 4w and 3w/2w
    if (fourWheelers.length > 0 && (threeWheelers.length > 0 || twoWheelers.length > 0)) {
      courierNamesText += '\n\n';
    }
    
    // Add 3-wheelers with type
    if (threeWheelers.length > 0) {
      courierNamesText += threeWheelers.map(summary => `${summary.courier} (3W)`).join('\n');
    }
    
    // Add spacing between 3w and 2w
    if (threeWheelers.length > 0 && twoWheelers.length > 0) {
      courierNamesText += '\n\n';
    }
    
    // Add 2-wheelers with type
    if (twoWheelers.length > 0) {
      courierNamesText += twoWheelers.map(summary => `${summary.courier} (2W)`).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(courierNamesText);
      alert('Courier names with vehicle types copied to clipboard with spacing!');
    } catch (error) {
      console.error('Failed to copy courier names:', error);
      alert('Failed to copy courier names to clipboard');
    }
  };

  const copyVehicleTypes = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = courierSummaries.filter(c => c.vehicleType === '4w');
    const threeWheelers = courierSummaries.filter(c => c.vehicleType === '3w');
    const twoWheelers = courierSummaries.filter(c => c.vehicleType === '2w');
    
    let vehicleTypesText = '';
    
    // Add 4W types
    if (fourWheelers.length > 0) {
      vehicleTypesText += fourWheelers.map(() => '4W').join('\n');
    }
    
    // Add spacing between 4w and 3w/2w
    if (fourWheelers.length > 0 && (threeWheelers.length > 0 || twoWheelers.length > 0)) {
      vehicleTypesText += '\n\n';
    }
    
    // Add 3W types
    if (threeWheelers.length > 0) {
      vehicleTypesText += threeWheelers.map(() => '3W').join('\n');
    }
    
    // Add spacing between 3w and 2w
    if (threeWheelers.length > 0 && twoWheelers.length > 0) {
      vehicleTypesText += '\n\n';
    }
    
    // Add 2W types
    if (twoWheelers.length > 0) {
      vehicleTypesText += twoWheelers.map(() => '2W').join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(vehicleTypesText);
      alert('Vehicle types copied to clipboard with spacing!');
    } catch (error) {
      console.error('Failed to copy vehicle types:', error);
      alert('Failed to copy vehicle types to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Courier Trips Analysis</h2>
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
                  Paste your table data here:
                </label>
                <textarea
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder="Paste your courier trips table data here..."
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Courier Summary</h3>
                <div className="flex gap-3">
                  <button
                    onClick={copyCourierNames}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    📋 Copy Names
                  </button>
                  <button
                    onClick={copyCourierNamesWithTypes}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    🏷️ Copy Names + Types
                  </button>
                  <button
                    onClick={copyTotalParcels}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    📦 Copy Totals
                  </button>
                  <button
                    onClick={copyVehicleTypes}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    🚚 Copy Vehicle Types
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
                  <h4 className="font-semibold text-blue-800 dark:text-blue-400">Total Couriers</h4>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{courierSummaries.length}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-green-800 dark:text-green-400">Total Trips</h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {courierSummaries.reduce((sum, c) => sum + c.tripCount, 0)}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-400">Total Parcels</h4>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {courierSummaries.reduce((sum, c) => sum + c.totalParcels, 0)}
                  </p>
                </div>
              </div>

              {/* Courier Details Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Courier Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Vehicle Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Database Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Courier ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Trip Count
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Total Parcels
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Successful
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Failed
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Success Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {courierSummaries.map((summary, index) => (
                      <tr key={index} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                        !summary.inDatabase ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                      }`}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                          <div className="flex items-center space-x-2">
                            <span>{summary.courier}</span>
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
                              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                              : summary.vehicleType === '3w'
                              ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400'
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
                          {summary.courierId}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                            {summary.tripCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className="font-semibold text-slate-900 dark:text-white">{summary.totalParcels}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-green-600 dark:text-green-400 font-semibold">{summary.totalSuccessful}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-red-600 dark:text-red-400 font-semibold">{summary.totalFailed}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className={`font-semibold ${
                            summary.totalSuccessful > 0 
                              ? (summary.totalSuccessful / (summary.totalSuccessful + summary.totalFailed) * 100) >= 90 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-yellow-600 dark:text-yellow-400'
                              : 'text-slate-400'
                          }`}>
                            {summary.totalSuccessful > 0 || summary.totalFailed > 0
                              ? `${((summary.totalSuccessful / (summary.totalSuccessful + summary.totalFailed)) * 100).toFixed(1)}%`
                              : 'N/A'
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vehicle Type Summary */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">4-Wheeler Couriers</h4>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {courierSummaries.filter(c => c.vehicleType === '4w').length}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Total Parcels: {courierSummaries.filter(c => c.vehicleType === '4w').reduce((sum, c) => sum + c.totalParcels, 0)}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">2-Wheeler Couriers</h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {courierSummaries.filter(c => c.vehicleType === '2w').length}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Total Parcels: {courierSummaries.filter(c => c.vehicleType === '2w').reduce((sum, c) => sum + c.totalParcels, 0)}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-red-800 dark:text-red-400 mb-2">Missing from Database</h4>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {courierSummaries.filter(c => !c.inDatabase).length}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Need to be added
                  </p>
                </div>
              </div>

              {/* Detailed Trips Breakdown */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Detailed Trip Breakdown</h4>
                {courierSummaries.map((summary, courierIndex) => (
                  <div key={courierIndex} className="mb-6 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <h5 className="font-semibold text-slate-900 dark:text-white">
                        {summary.courier} (ID: {summary.courierId}) - {summary.tripCount} trips
                      </h5>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white dark:bg-slate-800">
                        <thead className="bg-slate-100 dark:bg-slate-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Runsheet</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Successful</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Failed</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Dispatched</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {summary.trips.map((trip, tripIndex) => (
                            <tr key={tripIndex} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-3 py-2 text-sm text-slate-900 dark:text-white">{trip.runsheet}</td>
                              <td className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  trip.type === 'Delivery' 
                                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400' 
                                    : 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400'
                                }`}>
                                  {trip.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{trip.total}</td>
                              <td className="px-3 py-2 text-sm text-green-600 dark:text-green-400 font-semibold">{trip.successful}</td>
                              <td className="px-3 py-2 text-sm text-red-600 dark:text-red-400 font-semibold">{trip.failed}</td>
                              <td className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{trip.dispatched}</td>
                              <td className="px-3 py-2 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  trip.checkInStatus === 'Pending' 
                                    ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' 
                                    : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                                }`}>
                                  {trip.checkInStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* Missing Couriers Notification */}
              {missingCouriers.length > 0 && (
                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
                    Missing Couriers Notification
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                    The following couriers were not found in the database. Please check the names and add them to the database if necessary:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {missingCouriers.map((courier, index) => (
                      <li key={index} className="text-slate-900 dark:text-white">
                        {courier.name} - Estimated Vehicle Type: <span className="font-semibold">{courier.estimatedType}</span>
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

export default CourierTripsModal;