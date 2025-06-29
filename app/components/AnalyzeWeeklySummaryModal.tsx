import React, { useState, useEffect } from 'react';

interface CourierTrip {
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
  date?: string; // Extracted from dispatched field
  vehicleType?: string; // Vehicle type from database
  inDatabase?: boolean; // Track if courier exists in database
}

interface CourierSummary {
  courier: string;
  courierId: string;
  tripCount: number;
  totalParcels: number;
  totalSuccessful: number;
  totalFailed: number;
  trips: CourierTrip[];
  vehicleType: string;
  inDatabase: boolean;
  hasDuplicates: boolean; // Track if this courier has multiple trips
}

interface DaySummary {
  date: string;
  formattedDate: string;
  courierCount: number;
  totalParcels: number;
  totalSuccessful: number;
  totalFailed: number;
  trips: CourierTrip[];
  courierSummaries: CourierSummary[]; // Aggregated courier data for this day
  vehicleTypeCounts: { [key: string]: number }; // Count by vehicle type
  vehicleTypeStats: { [key: string]: { parcels: number; successful: number; failed: number; successRate: number } }; // Stats by vehicle type
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

interface MissingCourier {
  name: string;
  estimatedType: string;
}

interface AnalyzeWeeklySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AnalyzeWeeklySummaryModal: React.FC<AnalyzeWeeklySummaryModalProps> = ({ isOpen, onClose }) => {
  const [pastedData, setPastedData] = useState('');
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [databaseCouriers, setDatabaseCouriers] = useState<DatabaseCourier[]>([]);
  const [missingCouriers, setMissingCouriers] = useState<MissingCourier[]>([]);
  const [isLoadingCouriers, setIsLoadingCouriers] = useState(false);
  const [totalStats, setTotalStats] = useState({
    totalCouriers: 0,
    totalParcels: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    totalDays: 0,
    vehicleTypeCounts: {} as { [key: string]: number }
  });

  // Load database couriers on component mount
  useEffect(() => {
    if (isOpen) {
      loadDatabaseCouriers();
    }
  }, [isOpen]);

  const loadDatabaseCouriers = async () => {
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
    const name = courierName.toLowerCase();
    
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

  const parseDate = (dispatchedString: string): string | null => {
    // Extract date from "15/06/2025 08:08:44" format
    const dateMatch = dispatchedString.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      return dateMatch[1];
    }
    return null;
  };

  const formatDateForDisplay = (dateString: string): string => {
    // Convert "15/06/2025" to "June 15, 2025"
    const [day, month, year] = dateString.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const parseCourierData = (data: string): CourierTrip[] => {
    const lines = data.trim().split('\n').filter(line => line.trim());
    const trips: CourierTrip[] = [];
    const foundMissingCouriers: MissingCourier[] = [];

    // Skip header line if it exists
    const startIndex = lines[0].includes('Runsheet') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Split by tab or multiple spaces
      const columns = line.split(/\t+|\s{2,}/).filter(col => col.trim());
      
      if (columns.length >= 11) {
        const dispatched = columns[9] || '';
        const extractedDate = parseDate(dispatched);
        const courierName = columns[1] || '';
        
        if (extractedDate && courierName) {
          // Find courier in database for vehicle type
          const dbCourier = databaseCouriers.find(c => 
            c.name.toUpperCase().trim() === courierName.toUpperCase().trim()
          );
          const vehicleType = dbCourier?.type || estimateVehicleType(courierName);
          const inDatabase = !!dbCourier;

          // Track missing couriers
          if (!inDatabase) {
            const existingMissing = foundMissingCouriers.find(m => m.name === courierName);
            if (!existingMissing) {
              foundMissingCouriers.push({
                name: courierName,
                estimatedType: vehicleType
              });
            }
          }

          const trip: CourierTrip = {
            runsheet: columns[0] || '',
            courier: courierName,
            courierId: columns[2] || '',
            helperCheckIn: columns[3] || '',
            type: columns[4] || '',
            total: parseInt(columns[5]) || 0,
            successful: parseInt(columns[6]) || 0,
            failed: parseInt(columns[7]) || 0,
            checkedInParcels: columns[8] || '',
            dispatched: dispatched,
            checkInStatus: columns[10] || '',
            action: columns[11] || '',
            date: extractedDate,
            vehicleType,
            inDatabase
          };
          
          trips.push(trip);
        }
      }
    }

    setMissingCouriers(foundMissingCouriers);
    return trips;
  };

  const aggregateCouriersByDay = (trips: CourierTrip[]): { [date: string]: CourierSummary[] } => {
    const dayMap = new Map<string, Map<string, CourierSummary>>();

    trips.forEach(trip => {
      if (!trip.date) return;

      if (!dayMap.has(trip.date)) {
        dayMap.set(trip.date, new Map());
      }

      const courierMap = dayMap.get(trip.date)!;
      const courierKey = trip.courier; // Use courier name as key to aggregate duplicates

      if (courierMap.has(courierKey)) {
        const summary = courierMap.get(courierKey)!;
        summary.totalParcels += trip.total;
        summary.totalSuccessful += trip.successful;
        summary.totalFailed += trip.failed;
        summary.trips.push(trip);
        summary.hasDuplicates = true; // Mark as duplicate
      } else {
        courierMap.set(courierKey, {
          courier: trip.courier,
          courierId: trip.courierId,
          tripCount: 1, // Always 1 trip per courier per day (even if duplicates exist)
          totalParcels: trip.total,
          totalSuccessful: trip.successful,
          totalFailed: trip.failed,
          vehicleType: trip.vehicleType || '2w',
          inDatabase: trip.inDatabase || false,
          trips: [trip],
          hasDuplicates: false // No duplicates initially
        });
      }
    });

    // Convert to object with sorted courier summaries
    const result: { [date: string]: CourierSummary[] } = {};
    dayMap.forEach((courierMap, date) => {
      const summaries = Array.from(courierMap.values()).filter(summary => 
        summary.totalParcels > 0
      );

      // Sort by vehicle type (4w first, then 3w, then 2w), then by courier name
      summaries.sort((a, b) => {
        const typeOrder = { '4w': 0, '3w': 1, '2w': 2 };
        const aTypeOrder = typeOrder[a.vehicleType as keyof typeof typeOrder] ?? 3;
        const bTypeOrder = typeOrder[b.vehicleType as keyof typeof typeOrder] ?? 3;
        
        if (aTypeOrder !== bTypeOrder) {
          return aTypeOrder - bTypeOrder;
        }
        
        return a.courier.localeCompare(b.courier);
      });

      result[date] = summaries;
    });

    return result;
  };

  const groupByDay = (trips: CourierTrip[]): DaySummary[] => {
    const couriersByDay = aggregateCouriersByDay(trips);
    const dayMap = new Map<string, DaySummary>();

    // Initialize day summaries
    trips.forEach(trip => {
      if (!trip.date) return;

      if (!dayMap.has(trip.date)) {
        dayMap.set(trip.date, {
          date: trip.date,
          formattedDate: formatDateForDisplay(trip.date),
          courierCount: 0,
          totalParcels: 0,
          totalSuccessful: 0,
          totalFailed: 0,
          trips: [],
          courierSummaries: [],
          vehicleTypeCounts: {},
          vehicleTypeStats: {} // Initialize empty stats object
        });
      }
    });

    // Populate day summaries with aggregated courier data
    Object.entries(couriersByDay).forEach(([date, courierSummaries]) => {
      const daySummary = dayMap.get(date);
      if (!daySummary) return;

      daySummary.courierSummaries = courierSummaries;
      daySummary.courierCount = courierSummaries.length;

      // Calculate totals and vehicle type counts
      const vehicleTypeCounts: { [key: string]: number } = {};
      const vehicleTypeStats: { [key: string]: { parcels: number; successful: number; failed: number; successRate: number } } = {};
      courierSummaries.forEach(summary => {
        daySummary.totalParcels += summary.totalParcels;
        daySummary.totalSuccessful += summary.totalSuccessful;
        daySummary.totalFailed += summary.totalFailed;
        daySummary.trips.push(...summary.trips);

        // Count vehicle types
        const vType = summary.vehicleType.toUpperCase();
        vehicleTypeCounts[vType] = (vehicleTypeCounts[vType] || 0) + 1;

        // Calculate vehicle type stats
        if (!vehicleTypeStats[vType]) {
          vehicleTypeStats[vType] = {
            parcels: 0,
            successful: 0,
            failed: 0,
            successRate: 0
          };
        }
        vehicleTypeStats[vType].parcels += summary.totalParcels;
        vehicleTypeStats[vType].successful += summary.totalSuccessful;
        vehicleTypeStats[vType].failed += summary.totalFailed;
        vehicleTypeStats[vType].successRate = vehicleTypeStats[vType].parcels > 0 ? (vehicleTypeStats[vType].successful / vehicleTypeStats[vType].parcels) * 100 : 0;
      });

      daySummary.vehicleTypeCounts = vehicleTypeCounts;
      daySummary.vehicleTypeStats = vehicleTypeStats; // Add stats to day summary
    });

    // Sort by date (most recent first)
    return Array.from(dayMap.values()).sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
  };

  const calculateTotalStats = (summaries: DaySummary[]) => {
    const uniqueCouriers = new Set<string>();
    const vehicleTypeCounts: { [key: string]: number } = {};
    let totalParcels = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    summaries.forEach(day => {
      day.courierSummaries.forEach(summary => {
        uniqueCouriers.add(summary.courier);
        const vType = summary.vehicleType.toUpperCase();
        vehicleTypeCounts[vType] = (vehicleTypeCounts[vType] || 0) + 1;
      });
      totalParcels += day.totalParcels;
      totalSuccessful += day.totalSuccessful;
      totalFailed += day.totalFailed;
    });

    setTotalStats({
      totalCouriers: uniqueCouriers.size,
      totalParcels,
      totalSuccessful,
      totalFailed,
      totalDays: summaries.length,
      vehicleTypeCounts
    });
  };

  const handleProcessData = () => {
    if (!pastedData.trim()) return;

    const trips = parseCourierData(pastedData);
    const summaries = groupByDay(trips);
    setDaySummaries(summaries);
    calculateTotalStats(summaries);
    setShowResults(true);
  };

  const handleReset = () => {
    setPastedData('');
    setDaySummaries([]);
    setShowResults(false);
    setMissingCouriers([]);
    setTotalStats({
      totalCouriers: 0,
      totalParcels: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      totalDays: 0,
      vehicleTypeCounts: {}
    });
  };

  const copyWeeklySummary = async () => {
    let summaryText = 'Weekly Courier Summary\n';
    summaryText += '======================\n\n';

    // Overall stats
    summaryText += 'OVERALL TOTALS\n';
    summaryText += '==============\n';
    summaryText += `Total Days: ${totalStats.totalDays}\n`;
    summaryText += `Unique Couriers: ${totalStats.totalCouriers}\n`;
    
    // Vehicle type breakdown
    Object.entries(totalStats.vehicleTypeCounts).sort().forEach(([type, count]) => {
      summaryText += `${type} Vehicles: ${count}\n`;
    });
    
    summaryText += `Total Parcels: ${totalStats.totalParcels}\n`;
    summaryText += `Total Successful: ${totalStats.totalSuccessful}\n`;
    summaryText += `Total Failed: ${totalStats.totalFailed}\n`;
    summaryText += `Overall Success Rate: ${totalStats.totalParcels > 0 ? ((totalStats.totalSuccessful / totalStats.totalParcels) * 100).toFixed(1) : 0}%\n\n`;

    // Daily breakdown
    daySummaries.forEach(day => {
      summaryText += `${day.formattedDate}\n`;
      summaryText += `Couriers: ${day.courierCount} (`;
      Object.entries(day.vehicleTypeCounts).sort().forEach(([type, count], index, arr) => {
        summaryText += `${count} ${type}`;
        if (index < arr.length - 1) summaryText += ', ';
      });
      summaryText += ')\n';
      summaryText += `Total Parcels: ${day.totalParcels}\n`;
      summaryText += `Successful: ${day.totalSuccessful}\n`;
      summaryText += `Failed: ${day.totalFailed}\n`;
      summaryText += `Success Rate: ${day.totalParcels > 0 ? ((day.totalSuccessful / day.totalParcels) * 100).toFixed(1) : 0}%\n`;
      summaryText += '\n';
    });

    // Missing couriers
    if (missingCouriers.length > 0) {
      summaryText += 'MISSING COURIERS\n';
      summaryText += '================\n';
      missingCouriers.forEach(courier => {
        summaryText += `${courier.name} (estimated: ${courier.estimatedType})\n`;
      });
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      alert('Weekly summary copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy summary:', error);
      alert('Failed to copy summary to clipboard');
    }
  };

  const copyDailyCounts = async () => {
    let countsText = '';
    
    daySummaries.forEach(day => {
      countsText += `${day.formattedDate}: ${day.courierCount} couriers (`;
      Object.entries(day.vehicleTypeCounts).sort().forEach(([type, count], index, arr) => {
        countsText += `${count} ${type}`;
        if (index < arr.length - 1) countsText += ', ';
      });
      countsText += ')\n';
    });

    try {
      await navigator.clipboard.writeText(countsText);
      alert('Daily courier counts copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy counts:', error);
      alert('Failed to copy counts to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Analyze Weekly Summary</h2>
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
              {isLoadingCouriers && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-blue-800 dark:text-blue-400">Loading courier database...</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Paste your courier runsheet data here:
                </label>
                <textarea
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder={`Paste your runsheet data here. Expected format:
Runsheet	Courier	Courier ID	Helper Check-in	Type	Total	Successful	Failed	Checked-In Parcels	Dispatched	Check-in Status	Action
181839319	JEROME LARIOSA CABALLERO	292940	-	Delivery	75	50	25	25 / 25	15/06/2025 08:08:44	Completed	Print Manifest
181826985	NELGIE SEGADOR MAHIPOS	286605	-	Delivery	63	47	16	16 / 16	15/06/2025 07:52:31	Completed	Print Manifest`}
                  className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-md 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleProcessData}
                  disabled={!pastedData.trim() || isLoadingCouriers}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md 
                           disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed 
                           transition-colors"
                >
                  Analyze Weekly Data
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Weekly Summary Results</h3>
                <div className="flex gap-3">
                  <button
                    onClick={copyDailyCounts}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    📋 Copy Daily Counts
                  </button>
                  <button
                    onClick={copyWeeklySummary}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    📊 Copy Full Summary
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Analyze New Data
                  </button>
                </div>
              </div>

              {/* Missing Couriers Alert */}
              {missingCouriers.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-400 mb-2">
                    ⚠️ Couriers not found in database ({missingCouriers.length}):
                  </h4>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    {missingCouriers.map((courier, index) => (
                      <span key={index} className="inline-block mr-4 mb-1">
                        {courier.name} ({courier.estimatedType})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-400">Total Days</h4>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalStats.totalDays}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-green-800 dark:text-green-400">Unique Couriers</h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalStats.totalCouriers}</p>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {Object.entries(totalStats.vehicleTypeCounts).sort().map(([type, count]) => (
                      <span key={type} className="mr-2">{count} {type}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-400">Total Parcels</h4>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalStats.totalParcels.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-400">Successful</h4>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalStats.totalSuccessful.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-red-800 dark:text-red-400">Failed</h4>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalStats.totalFailed.toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-400">Success Rate</h4>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {totalStats.totalParcels > 0 ? ((totalStats.totalSuccessful / totalStats.totalParcels) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              {/* Daily Summary Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Vehicle Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Couriers
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        Avg/Courier
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {daySummaries.map((day, dayIndex) => {
                      const vehicleTypes = Object.keys(day.vehicleTypeStats).sort();
                      const totalRows = vehicleTypes.length + 1; // +1 for the total row
                      
                      return (
                        <React.Fragment key={dayIndex}>
                          {/* Vehicle Type Rows */}
                          {vehicleTypes.map((vehicleType, typeIndex) => {
                            const stats = day.vehicleTypeStats[vehicleType];
                            const courierCount = day.vehicleTypeCounts[vehicleType] || 0;
                            const avgParcels = courierCount > 0 ? stats.parcels / courierCount : 0;
                            
                            return (
                              <tr key={`${dayIndex}-${vehicleType}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                {typeIndex === 0 && (
                                  <td rowSpan={totalRows} className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700 align-top">
                                    <div className="font-semibold">{day.formattedDate}</div>
                                  </td>
                                )}
                                <td className="px-4 py-3 text-sm border-b border-slate-200 dark:border-slate-700">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    vehicleType === '4W' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                                    vehicleType === '3W' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
                                    'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400'
                                  }`}>
                                    {vehicleType}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                                  {courierCount}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                                  {stats.parcels.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 border-b border-slate-200 dark:border-slate-700">
                                  {stats.successful.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 border-b border-slate-200 dark:border-slate-700">
                                  {stats.failed.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm border-b border-slate-200 dark:border-slate-700">
                                  <span className={`font-medium ${
                                    stats.successRate >= 90 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : stats.successRate >= 80
                                      ? 'text-yellow-600 dark:text-yellow-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {stats.successRate.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                  {avgParcels.toFixed(1)}
                                </td>
                              </tr>
                            );
                          })}
                          
                          {/* Total Row for the day */}
                          <tr className="bg-slate-50 dark:bg-slate-700/30 font-semibold">
                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200">
                                TOTAL
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                              {day.courierCount}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                              {day.totalParcels.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 border-b border-slate-200 dark:border-slate-700">
                              {day.totalSuccessful.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 border-b border-slate-200 dark:border-slate-700">
                              {day.totalFailed.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm border-b border-slate-200 dark:border-slate-700">
                              <span className={`font-bold ${
                                (day.totalParcels > 0 ? (day.totalSuccessful / day.totalParcels) * 100 : 0) >= 90 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : (day.totalParcels > 0 ? (day.totalSuccessful / day.totalParcels) * 100 : 0) >= 80
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {day.totalParcels > 0 ? ((day.totalSuccessful / day.totalParcels) * 100).toFixed(1) : '0.0'}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                              {day.courierCount > 0 ? (day.totalParcels / day.courierCount).toFixed(1) : '0.0'}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vehicle Type Breakdown Table */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Vehicle Type Performance Breakdown</h4>
                {daySummaries.map((day, dayIndex) => (
                  <div key={dayIndex} className="bg-slate-50 dark:bg-slate-700/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h5 className="text-md font-semibold text-slate-800 dark:text-slate-300 mb-3">
                      {day.formattedDate} - Vehicle Performance
                    </h5>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700/50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Vehicle Type
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Couriers
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Total Parcels
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Successful
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Failed
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Success Rate
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Avg Parcels/Courier
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {Object.entries(day.vehicleTypeStats).sort().map(([vehicleType, stats]) => {
                            const courierCount = day.vehicleTypeCounts[vehicleType] || 0;
                            const avgParcelsPerCourier = courierCount > 0 ? stats.parcels / courierCount : 0;
                            
                            return (
                              <tr key={vehicleType} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-3 py-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    vehicleType === '4W' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                                    vehicleType === '3W' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
                                    'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400'
                                  }`}>
                                    {vehicleType}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-900 dark:text-white font-semibold">
                                  {courierCount}
                                </td>
                                <td className="px-3 py-2 text-slate-900 dark:text-white font-semibold">
                                  {stats.parcels.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-green-600 dark:text-green-400 font-semibold">
                                  {stats.successful.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-red-600 dark:text-red-400 font-semibold">
                                  {stats.failed.toLocaleString()}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`font-semibold ${
                                    stats.successRate >= 90 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : stats.successRate >= 80
                                      ? 'text-yellow-600 dark:text-yellow-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {stats.successRate.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                                  {avgParcelsPerCourier.toFixed(1)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Courier List for Each Day */}
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Daily Courier Details</h4>
                {daySummaries.map((day, dayIndex) => (
                  <div key={dayIndex} className="bg-slate-50 dark:bg-slate-700/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h5 className="text-md font-semibold text-slate-800 dark:text-slate-300 mb-3">
                      {day.formattedDate} - {day.courierCount} Couriers
                      <span className="ml-2 text-sm font-normal text-slate-600 dark:text-slate-400">
                        ({Object.entries(day.vehicleTypeCounts).sort().map(([type, count]) => `${count} ${type}`).join(', ')})
                      </span>
                    </h5>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700/50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Courier
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Vehicle
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Trips
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Successful
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Failed
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Success Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {day.courierSummaries.map((summary, summaryIndex) => {
                            const successRate = summary.totalParcels > 0 ? (summary.totalSuccessful / summary.totalParcels) * 100 : 0;
                            return (
                              <tr key={summaryIndex} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-3 py-2 text-slate-900 dark:text-white font-medium">
                                  <div className="flex items-center gap-2">
                                    {summary.courier}
                                    {!summary.inDatabase && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                                        ⚠️
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    summary.vehicleType === '4w' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                                    summary.vehicleType === '3w' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
                                    'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400'
                                  }`}>
                                    {summary.vehicleType.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                                  {summary.tripCount}
                                </td>
                                <td className="px-3 py-2 text-slate-900 dark:text-white font-semibold">
                                  {summary.totalParcels.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-green-600 dark:text-green-400 font-semibold">
                                  {summary.totalSuccessful.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-red-600 dark:text-red-400 font-semibold">
                                  {summary.totalFailed.toLocaleString()}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`font-semibold ${
                                    successRate >= 90 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : successRate >= 80
                                      ? 'text-yellow-600 dark:text-yellow-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {successRate.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyzeWeeklySummaryModal;