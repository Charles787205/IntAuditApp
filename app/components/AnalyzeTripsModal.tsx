import React, { useState, useEffect } from 'react';

interface AnalyzeTrip {
  id: string;
  driver: string;
  driverId: string;
  type: string;
  total: number;
  successful: number;
  failed: number;
  platform: 'courier' | 'shopee' | 'lazada';
  vehicleType?: string;
  inDatabase: boolean;
}

interface AnalyzeSummary {
  driver: string;
  driverId: string;
  tripCount: number;
  totalParcels: number;
  totalSuccessful: number;
  totalFailed: number;
  trips: AnalyzeTrip[];
  vehicleType?: string;
  inDatabase: boolean;
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

interface AnalyzeTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AnalyzeTripsModal: React.FC<AnalyzeTripsModalProps> = ({ isOpen, onClose }) => {
  const [pastedData, setPastedData] = useState('');
  const [driverSummaries, setDriverSummaries] = useState<AnalyzeSummary[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [databaseCouriers, setDatabaseCouriers] = useState<DatabaseCourier[]>([]);
  const [isLoadingCouriers, setIsLoadingCouriers] = useState(false);
  const [missingDrivers, setMissingDrivers] = useState<{name: string, estimatedType: string}[]>([]);
  const [platform, setPlatform] = useState<'auto' | 'courier' | 'shopee' | 'lazada'>('auto');

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
    
    // Default assumption - most individual drivers use motorcycles (2w)
    return '2w';
  };

  // Parse data for multiple platforms
  const parseTripsData = (data: string): AnalyzeTrip[] => {
    const lines = data.trim().split('\n').filter(line => line.trim());
    const trips: AnalyzeTrip[] = [];

    console.log('Total lines:', lines.length);

    // Database courier names for matching
    const dbCourierNames = databaseCouriers.map(c => c.name.toUpperCase().trim());
    
    // Known courier names from different platforms
    const courierNames = [
      'MARK HIMARANGAN GUILLERMO', 'JULLUS RHAY ARMAMENTO TOME', 'ROMER FERNANDEZ CASTRO',
      'LEA LAUDE DECENA', 'JEILEBER BAQUILO RASONABLE', 'THERESE ANGELIE SILVERIO VALENCIA',
      'JAIME BILLON PUSTA JR', 'RYAN MASINAPOC TAYA', 'JEFFREY MESA GIRAO',
      'JEROME LARIOSA CABALLERO', 'ROY LEMUEL VICTORIANO GASTAR', 'RHENO PLAYDA CANGAS'
    ];

    const shopeeDrivers = [
      'John Felix Uzon Tabaque', 'Jauary Mariquez San Juan', 'Irjie Agudo Rosales',
      'Irish Tabaque Acabo', 'Jason Langtad Gastones', 'Bernard Joseph Maranga Aben'
    ];

    // Combine all known names
    const allDriverNames = [...new Set([...dbCourierNames, ...courierNames, ...shopeeDrivers])];

    // Auto-detect platform based on data patterns
    let detectedPlatform: 'courier' | 'shopee' | 'lazada' = 'courier';
    if (platform === 'auto') {
      if (data.includes('[') && data.includes(']')) {
        detectedPlatform = 'shopee'; // Shopee format has [ID] patterns
      } else if (data.includes('AT') && /AT\d+[A-Z0-9]+/.test(data)) {
        detectedPlatform = 'shopee'; // Shopee task IDs
      } else {
        detectedPlatform = 'courier'; // Default to courier
      }
    } else {
      detectedPlatform = platform as 'courier' | 'shopee' | 'lazada';
    }

    // Parse based on detected platform
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      
      // Find matching driver name
      const matchedDriver = allDriverNames.find(name => 
        line === name || line.includes(name)
      );
      
      if (matchedDriver) {
        console.log(`Found driver: ${matchedDriver} at line ${i}`);
        
        let tripId = '';
        let driverId = '';
        let totalParcels = 0;
        let successful = 0;
        let failed = 0;
        let tripType = 'Delivery';

        if (detectedPlatform === 'shopee') {
          // Shopee parsing logic
          const driverIdMatch = line.match(/\[(\d+)\]/);
          driverId = driverIdMatch ? driverIdMatch[1] : '';
          
          // Look for task ID and parcel counts
          for (let j = i - 5; j <= i + 5; j++) {
            if (j >= 0 && j < lines.length) {
              const checkLine = lines[j].trim();
              if (/^AT\d+[A-Z0-9]+$/.test(checkLine)) {
                tripId = checkLine;
                totalParcels = j + 8 < lines.length ? parseInt(lines[j + 8].trim()) || 0 : 0;
                successful = totalParcels; // Shopee doesn't differentiate success/fail in this context
                break;
              }
            }
          }
        } else {
          // Courier parsing logic
          tripId = i > 0 ? lines[i - 1].trim() : '';
          driverId = i + 1 < lines.length ? lines[i + 1].trim() : '';
          totalParcels = i + 4 < lines.length ? parseInt(lines[i + 4].trim()) || 0 : 0;
          successful = i + 5 < lines.length ? parseInt(lines[i + 5].trim()) || 0 : 0;
          failed = i + 6 < lines.length ? parseInt(lines[i + 6].trim()) || 0 : 0;
          tripType = i + 3 < lines.length ? lines[i + 3].trim() : 'Delivery';
        }
        
        console.log(`Driver: ${matchedDriver}, Total: ${totalParcels}, Successful: ${successful}, Failed: ${failed}`);
        
        const trip: AnalyzeTrip = {
          id: tripId,
          driver: matchedDriver,
          driverId: driverId,
          type: tripType,
          total: totalParcels,
          successful: successful,
          failed: failed,
          platform: detectedPlatform,
          vehicleType: '',
          inDatabase: false
        };

        trips.push(trip);
      }
    }

    console.log('Total trips parsed:', trips.length);
    return trips;
  };

  const aggregateByDriver = (trips: AnalyzeTrip[]): AnalyzeSummary[] => {
    const driverMap = new Map<string, AnalyzeSummary>();
    const foundMissingDrivers: {name: string, estimatedType: string}[] = [];

    trips.forEach(trip => {
      const cleanDriverName = trip.driver.replace(/\[\d+\]\s*/, '').trim();
      // Use only the driver name as key to properly aggregate duplicate couriers
      const key = cleanDriverName;
      
      // Find driver in database
      const dbCourier = databaseCouriers.find(c => 
        c.name.toUpperCase().trim() === cleanDriverName.toUpperCase().trim()
      );
      
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
      
      trip.vehicleType = vehicleType;
      trip.inDatabase = inDatabase;
      
      if (driverMap.has(key)) {
        const summary = driverMap.get(key)!;
        summary.tripCount++;
        summary.totalParcels += trip.total;
        summary.totalSuccessful += trip.successful;
        summary.totalFailed += trip.failed;
        summary.trips.push(trip);
      } else {
        driverMap.set(key, {
          driver: cleanDriverName,
          driverId: trip.driverId, // Keep the first driver ID found
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

  const handleProcessData = () => {
    if (!pastedData.trim()) return;

    const trips = parseTripsData(pastedData);
    console.log('Parsed trips:', trips);
    const summaries = aggregateByDriver(trips);
    console.log('Driver summaries:', summaries);
    setDriverSummaries(summaries);
    setShowResults(true);
  };

  const handleReset = () => {
    setPastedData('');
    setDriverSummaries([]);
    setShowResults(false);
    setPlatform('auto');
  };

  const copyTotalParcels = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = driverSummaries.filter(d => d.vehicleType === '4w');
    const threeWheelers = driverSummaries.filter(d => d.vehicleType === '3w');
    const twoWheelers = driverSummaries.filter(d => d.vehicleType === '2w');
    
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

  const copyDriverNamesWithTypes = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = driverSummaries.filter(d => d.vehicleType === '4w');
    const threeWheelers = driverSummaries.filter(d => d.vehicleType === '3w');
    const twoWheelers = driverSummaries.filter(d => d.vehicleType === '2w');
    
    let driverNamesText = '';
    
    // Add 4-wheelers with type
    if (fourWheelers.length > 0) {
      driverNamesText += fourWheelers.map(summary => `${summary.driver} (4W)`).join('\n');
    }
    
    // Add spacing between 4w and 3w/2w
    if (fourWheelers.length > 0 && (threeWheelers.length > 0 || twoWheelers.length > 0)) {
      driverNamesText += '\n\n';
    }
    
    // Add 3-wheelers with type
    if (threeWheelers.length > 0) {
      driverNamesText += threeWheelers.map(summary => `${summary.driver} (3W)`).join('\n');
    }
    
    // Add spacing between 3w and 2w
    if (threeWheelers.length > 0 && twoWheelers.length > 0) {
      driverNamesText += '\n\n';
    }
    
    // Add 2-wheelers with type
    if (twoWheelers.length > 0) {
      driverNamesText += twoWheelers.map(summary => `${summary.driver} (2W)`).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(driverNamesText);
      alert('Driver names with vehicle types copied to clipboard with spacing!');
    } catch (error) {
      console.error('Failed to copy driver names:', error);
      alert('Failed to copy driver names to clipboard');
    }
  };

  const copyVehicleTypes = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = driverSummaries.filter(d => d.vehicleType === '4w');
    const threeWheelers = driverSummaries.filter(d => d.vehicleType === '3w');
    const twoWheelers = driverSummaries.filter(d => d.vehicleType === '2w');
    
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

  const copySuccessRates = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = driverSummaries.filter(d => d.vehicleType === '4w');
    const threeWheelers = driverSummaries.filter(d => d.vehicleType === '3w');
    const twoWheelers = driverSummaries.filter(d => d.vehicleType === '2w');
    
    let successRatesText = '';
    
    // Add 4-wheelers success rates
    if (fourWheelers.length > 0) {
      successRatesText += fourWheelers.map(summary => {
        const totalDelivered = summary.totalSuccessful;
        const totalParcels = summary.totalParcels;
        const successRate = totalParcels > 0 ? ((totalDelivered / totalParcels) * 100).toFixed(1) : '0.0';
        return `${successRate}%`;
      }).join('\n');
    }
    
    // Add spacing between 4w and 3w/2w
    if (fourWheelers.length > 0 && (threeWheelers.length > 0 || twoWheelers.length > 0)) {
      successRatesText += '\n\n';
    }
    
    // Add 3-wheelers success rates
    if (threeWheelers.length > 0) {
      successRatesText += threeWheelers.map(summary => {
        const totalDelivered = summary.totalSuccessful;
        const totalParcels = summary.totalParcels;
        const successRate = totalParcels > 0 ? ((totalDelivered / totalParcels) * 100).toFixed(1) : '0.0';
        return `${successRate}%`;
      }).join('\n');
    }
    
    // Add spacing between 3w and 2w
    if (threeWheelers.length > 0 && twoWheelers.length > 0) {
      successRatesText += '\n\n';
    }
    
    // Add 2-wheelers success rates
    if (twoWheelers.length > 0) {
      successRatesText += twoWheelers.map(summary => {
        const totalDelivered = summary.totalSuccessful;
        const totalParcels = summary.totalParcels;
        const successRate = totalParcels > 0 ? ((totalDelivered / totalParcels) * 100).toFixed(1) : '0.0';
        return `${successRate}%`;
      }).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(successRatesText);
      alert('Success rates copied to clipboard with vehicle type spacing!');
    } catch (error) {
      console.error('Failed to copy success rates:', error);
      alert('Failed to copy success rates to clipboard');
    }
  };

  const copyDeliveredCounts = async () => {
    // Group by vehicle type for organized copying
    const fourWheelers = driverSummaries.filter(d => d.vehicleType === '4w');
    const threeWheelers = driverSummaries.filter(d => d.vehicleType === '3w');
    const twoWheelers = driverSummaries.filter(d => d.vehicleType === '2w');
    
    let deliveredText = '';
    
    // Add 4-wheelers delivered counts
    if (fourWheelers.length > 0) {
      deliveredText += fourWheelers.map(summary => summary.totalSuccessful).join('\n');
    }
    
    // Add spacing between 4w and 3w/2w
    if (fourWheelers.length > 0 && (threeWheelers.length > 0 || twoWheelers.length > 0)) {
      deliveredText += '\n\n';
    }
    
    // Add 3-wheelers delivered counts
    if (threeWheelers.length > 0) {
      deliveredText += threeWheelers.map(summary => summary.totalSuccessful).join('\n');
    }
    
    // Add spacing between 3w and 2w
    if (threeWheelers.length > 0 && twoWheelers.length > 0) {
      deliveredText += '\n\n';
    }
    
    // Add 2-wheelers delivered counts
    if (twoWheelers.length > 0) {
      deliveredText += twoWheelers.map(summary => summary.totalSuccessful).join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(deliveredText);
      alert('Delivered counts copied to clipboard with vehicle type spacing!');
    } catch (error) {
      console.error('Failed to copy delivered counts:', error);
      alert('Failed to copy delivered counts to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Analyze Trips</h2>
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
                  Platform Detection:
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full max-w-xs p-2 border border-slate-300 dark:border-slate-600 rounded-md 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white mb-4"
                >
                  <option value="auto">Auto-detect</option>
                  <option value="courier">Courier Platform</option>
                  <option value="shopee">Shopee Platform</option>
                  <option value="lazada">Lazada Platform</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Paste your trips data here:
                </label>
                <textarea
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder="Paste your trips table data here..."
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
                  Analyze Data
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Trip Analysis Results</h3>
                <div className="flex gap-3">
                  <button
                    onClick={copyDriverNames}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    📋 Copy Names
                  </button>
                  <button
                    onClick={copyDriverNamesWithTypes}
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
                    onClick={copyDeliveredCounts}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    ✅ Copy Delivered
                  </button>
                  <button
                    onClick={copySuccessRates}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    📊 Copy Success Rates
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                  <h4 className="font-semibold text-purple-800 dark:text-purple-400">Total Parcels</h4>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {driverSummaries.reduce((sum, d) => sum + d.totalParcels, 0)}
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-400">Overall Success Rate</h4>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {(() => {
                      const totalDelivered = driverSummaries.reduce((sum, d) => sum + d.totalSuccessful, 0);
                      const totalParcels = driverSummaries.reduce((sum, d) => sum + d.totalParcels, 0);
                      return totalParcels > 0 ? `${((totalDelivered / totalParcels) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    {driverSummaries.reduce((sum, d) => sum + d.totalSuccessful, 0)} / {driverSummaries.reduce((sum, d) => sum + d.totalParcels, 0)} delivered
                  </p>
                </div>
              </div>

              {/* Vehicle Type Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">4-Wheeler Drivers</h4>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {driverSummaries.filter(d => d.vehicleType === '4w').length}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Total Parcels: {driverSummaries.filter(d => d.vehicleType === '4w').reduce((sum, d) => sum + d.totalParcels, 0)}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Delivered: {driverSummaries.filter(d => d.vehicleType === '4w').reduce((sum, d) => sum + d.totalSuccessful, 0)}
                  </p>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Success Rate: {(() => {
                      const fourWheelers = driverSummaries.filter(d => d.vehicleType === '4w');
                      const totalDelivered = fourWheelers.reduce((sum, d) => sum + d.totalSuccessful, 0);
                      const totalParcels = fourWheelers.reduce((sum, d) => sum + d.totalParcels, 0);
                      return totalParcels > 0 ? `${((totalDelivered / totalParcels) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">2-Wheeler Drivers</h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {driverSummaries.filter(d => d.vehicleType === '2w').length}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Total Parcels: {driverSummaries.filter(d => d.vehicleType === '2w').reduce((sum, d) => sum + d.totalParcels, 0)}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Delivered: {driverSummaries.filter(d => d.vehicleType === '2w').reduce((sum, d) => sum + d.totalSuccessful, 0)}
                  </p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    Success Rate: {(() => {
                      const twoWheelers = driverSummaries.filter(d => d.vehicleType === '2w');
                      const totalDelivered = twoWheelers.reduce((sum, d) => sum + d.totalSuccessful, 0);
                      const totalParcels = twoWheelers.reduce((sum, d) => sum + d.totalParcels, 0);
                      return totalParcels > 0 ? `${((totalDelivered / totalParcels) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-400 mb-2">3-Wheeler Drivers</h4>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {driverSummaries.filter(d => d.vehicleType === '3w').length}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Total Parcels: {driverSummaries.filter(d => d.vehicleType === '3w').reduce((sum, d) => sum + d.totalParcels, 0)}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Delivered: {driverSummaries.filter(d => d.vehicleType === '3w').reduce((sum, d) => sum + d.totalSuccessful, 0)}
                  </p>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    Success Rate: {(() => {
                      const threeWheelers = driverSummaries.filter(d => d.vehicleType === '3w');
                      const totalDelivered = threeWheelers.reduce((sum, d) => sum + d.totalSuccessful, 0);
                      const totalParcels = threeWheelers.reduce((sum, d) => sum + d.totalParcels, 0);
                      return totalParcels > 0 ? `${((totalDelivered / totalParcels) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </p>
                </div>
              </div>

              {/* Parcels Summary */}
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/20 rounded-lg border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-800 dark:text-slate-300 mb-2">Delivery Performance Summary</h4>
                <p className="text-lg text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-blue-600 dark:text-blue-400">4W</span> - {driverSummaries.filter(d => d.vehicleType === '4w').reduce((sum, d) => sum + d.totalSuccessful, 0).toLocaleString()}/{driverSummaries.filter(d => d.vehicleType === '4w').reduce((sum, d) => sum + d.totalParcels, 0).toLocaleString()} delivered | 
                  <span className="font-bold text-green-600 dark:text-green-400 ml-2">2W</span> - {driverSummaries.filter(d => d.vehicleType === '2w').reduce((sum, d) => sum + d.totalSuccessful, 0).toLocaleString()}/{driverSummaries.filter(d => d.vehicleType === '2w').reduce((sum, d) => sum + d.totalParcels, 0).toLocaleString()} delivered
                </p>
              </div>

              {/* Driver Details Table */}
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-700">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Driver</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Vehicle Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Trips</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Total Parcels</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Delivered</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Success Rate</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverSummaries.map((summary, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                          {summary.driver}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            summary.vehicleType === '4w' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : summary.vehicleType === '3w'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {summary.vehicleType?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          {summary.tripCount}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          {summary.totalParcels}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-green-600 dark:text-green-400 font-semibold">{summary.totalSuccessful}</span>
                          <span className="text-slate-400 text-xs ml-1">/ {summary.totalParcels}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className={`font-semibold ${
                            summary.totalParcels > 0 
                              ? (summary.totalSuccessful / summary.totalParcels * 100) >= 90 
                                ? 'text-green-600 dark:text-green-400' 
                                : (summary.totalSuccessful / summary.totalParcels * 100) >= 75
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-red-600 dark:text-red-400'
                              : 'text-slate-400'
                          }`}>
                            {summary.totalParcels > 0
                              ? `${((summary.totalSuccessful / summary.totalParcels) * 100).toFixed(1)}%`
                              : 'N/A'
                            }
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            summary.inDatabase 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {summary.inDatabase ? 'In DB' : 'Missing'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Back button */}
              <button
                onClick={handleReset}
                className="mt-6 bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                ← Back to Input
              </button>

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

export default AnalyzeTripsModal;