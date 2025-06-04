'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateNewHandover from '@components/handover/CreateNewHandover';
import UploadUpdates from '@components/handover/UploadUpdates';
import PrintHandoverReport from '@components/handover/PrintHandoverReport';

interface HandoverData {
  trackingNo: string;
  portCode: string;
  packageType: string;
}

interface Handover {
  id: number;
  date: string;
  handoverFrom: string;
  handoverTo: string;
  status: 'pending' | 'done' | 'overdue';
  notes?: string;
  createdAt: string;
  title?: string;
  fileName?: string;
  extractedData?: HandoverData[];
  parcelCount?: number;
}

export default function HandoversPage() {
  const router = useRouter();
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedHandoverForUpload, setSelectedHandoverForUpload] = useState<Handover | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<'date' | 'createdAt'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load handovers from database via API
  useEffect(() => {
    const fetchHandovers = async () => {
      try {
        console.log('Fetching handovers from API...');
        const response = await fetch('/api/handovers');
        console.log('API Response status:', response.status);
        
        const data = await response.json();
        console.log('API Response data:', data);
        
        if (data.success && data.handovers) {
          console.log('Found database handovers:', data.handovers.length);
          
          // Transform database handovers to UI format
          const transformedHandovers = data.handovers.map((dbHandover: any) => ({
            id: dbHandover.id,
            date: dbHandover.handover_date.split('T')[0],
            handoverFrom: 'System',
            handoverTo: 'TBD',
            status: dbHandover.status, // Use actual status from database
            notes: `File: ${dbHandover.file_name} - ${dbHandover.quantity} records`,
            createdAt: dbHandover.date_added.split('T')[0],
            fileName: dbHandover.file_name,
            // Only keep the count of parcels, not the full data
            parcelCount: dbHandover.parcels?.length || 0
          }));
          
          setHandovers(transformedHandovers);
          console.log('Transformed handovers:', transformedHandovers);
        } else {
          console.log('No database handovers found or API failed');
          throw new Error('No handovers found');
        }
      } catch (error) {
        console.error('Error fetching handovers:', error);
        console.log('Falling back to mock data');
        
        // Fall back to mock data on error
        const mockHandovers: Handover[] = [
        
        ];
        setHandovers(mockHandovers);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHandovers();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      done: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      // Keep old statuses for compatibility
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSaveHandover = async (handoverData: { 
    file: File | null; 
    date: string;
    extractedData?: HandoverData[];
  }) => {
    try {
      const response = await fetch('/api/handovers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handoverData: {
            date: handoverData.date,
            fileName: handoverData.file?.name
          },
          extractedData: handoverData.extractedData
        })
      });

      const result = await response.json();

      if (result.success) {
        // Transform and add to UI state
        const uiHandover: Handover = {
          id: result.handover.id,
          date: handoverData.date,
          handoverFrom: 'Current User',
          handoverTo: 'TBD',
          status: 'pending',
          notes: `File: ${handoverData.file?.name || 'No file'} - ${handoverData.extractedData?.length || 0} records saved to database`,
          createdAt: new Date().toISOString().split('T')[0],
          fileName: handoverData.file?.name,
          extractedData: handoverData.extractedData,
          parcelCount: handoverData.extractedData?.length || 0
        };

        setHandovers(prev => [uiHandover, ...prev]);
        console.log('Handover and parcels saved to database:', result.handover);
      } else {
        throw new Error(result.error || 'Failed to save handover');
      }
      
    } catch (error) {
      console.error('Error saving handover to database:', error);
      alert('Failed to save handover to database. Please try again.');
    }
  };

  const handleViewData = (handover: Handover) => {
    setSelectedHandover(handover);
    setShowDataModal(true);
  };

  const handlePrintData = (handover: Handover) => {
    if (!handover.extractedData || handover.extractedData.length === 0) {
      alert('No data to print');
      return;
    }

    // Open the Print Handover Report component in a new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Handover Data - ${handover.fileName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
              .header { margin-bottom: 20px; }
              .info { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .total { margin-top: 20px; font-weight: bold; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Handover Data Report</h1>
              <div class="info">
                <p><strong>File:</strong> ${handover.fileName}</p>
                <p><strong>Date:</strong> ${new Date(handover.date).toLocaleDateString()}</p>
                <p><strong>Created:</strong> ${new Date(handover.createdAt).toLocaleDateString()}</p>
                <p><strong>Total Records:</strong> ${handover.extractedData.length}</p>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                 
                  <th>Tracking Number</th>
                  <th>Port Code</th>
                  <th>Package Type</th>
                </tr>
              </thead>
              <tbody>
                ${handover.extractedData.map((item, index) => `
                  <tr>
                 
                    <td>${item.trackingNo}</td>
                    <td>${item.portCode}</td>
                    <td>${item.packageType}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="total">
              Total: ${handover.extractedData.length} records
            </div>
            
            <div class="no-print" style="margin-top: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
              <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleViewHandover = (handoverId: number) => {
    router.push(`/handovers/${handoverId}`);
  };

  const handleUploadUpdates = (handover: Handover) => {
    setSelectedHandoverForUpload(handover);
    setShowUploadModal(true);
  };

  const handleUploadSuccess = () => {
    // Refresh handovers list
    const fetchHandovers = async () => {
      try {
        const response = await fetch('/api/handovers');
        const data = await response.json();
        
        if (data.success && data.handovers) {
          const transformedHandovers = data.handovers.map((dbHandover: any) => ({
            id: dbHandover.id,
            date: dbHandover.handover_date.split('T')[0],
            handoverFrom: 'System',
            handoverTo: 'TBD',
            status: dbHandover.status, // Use actual status from database
            notes: `File: ${dbHandover.file_name} - ${dbHandover.quantity} records`,
            createdAt: dbHandover.date_added.split('T')[0],
            fileName: dbHandover.file_name,
            // Only keep the count of parcels, not the full data
            parcelCount: dbHandover.parcels?.length || 0
          }));
          
          setHandovers(transformedHandovers);
        }
      } catch (error) {
        console.error('Error refreshing handovers:', error);
      }
    };
    
    fetchHandovers();
  };

  // Sorting function
  const sortedHandovers = [...handovers].sort((a, b) => {
    const aValue = sortField === 'date' ? new Date(a.date) : new Date(a.createdAt);
    const bValue = sortField === 'date' ? new Date(b.date) : new Date(b.createdAt);

    if (sortDirection === 'asc') {
      return aValue.getTime() - bValue.getTime();
    } else {
      return bValue.getTime() - aValue.getTime();
    }
  });

  // Sorting function to handle column header clicks
  const handleSort = (field: 'date' | 'createdAt') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to desc
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: 'date' | 'createdAt' }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4l4 4m0 0l-4 4m4-4H9" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Handovers</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track and manage audit handovers by date
          </p>
          {/* Debug indicator */}
          <div className="mt-1">
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded">
              {handovers.length > 0 && handovers[0].handoverFrom === 'System' 
                ? `📊 Showing ${handovers.length} records from database` 
                : `🔄 Showing ${handovers.length} mock records (database empty)`}
            </span>
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowUploadModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Upload Updates</span>
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + New Handover
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{handovers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Done</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {handovers.filter(h =>  h.status === 'done').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {handovers.filter(h => h.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Overdue</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {handovers.filter(h => h.status === 'overdue').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Handover Records</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date
                  <button onClick={() => handleSort('date')} className="ml-2">
                    <SortIcon field="date" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Created
                  <button onClick={() => handleSort('createdAt')} className="ml-2">
                    <SortIcon field="createdAt" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {sortedHandovers.map((handover) => (
                <tr 
                  key={handover.id} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                  onClick={() => handleViewHandover(handover.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {formatDate(handover.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">{handover.handoverFrom}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">{handover.handoverTo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(handover.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {handover.notes || 'No notes'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(handover.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {(handover.parcelCount && handover.parcelCount > 0) && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <PrintHandoverReport handoverId={handover.id} fileName={handover.fileName} />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Handover Modal */}
      <CreateNewHandover
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveHandover}
      />

      {/* Data Display Modal */}
      {showDataModal && selectedHandover && selectedHandover.extractedData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDataModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-4xl transform rounded-lg bg-white dark:bg-slate-800 shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Extracted Data - {selectedHandover.fileName}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {selectedHandover.extractedData.length} records found
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePrintData(selectedHandover)}
                    className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Print Data
                  </button>
                  <button
                    onClick={() => setShowDataModal(false)}
                    className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="p-6">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full border border-slate-200 dark:border-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                          Tracking Number
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                          Port Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                          Package Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {selectedHandover.extractedData.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                            {item.trackingNo}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                            {item.portCode}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                            {item.packageType}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
                  <span>Total: {selectedHandover.extractedData.length} records</span>
                  <span>File: {selectedHandover.fileName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Updates Modal - Global or Specific */}
      <UploadUpdates
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedHandoverForUpload(null);
        }}
        handoverId={selectedHandoverForUpload?.id} // Pass undefined for global uploads
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}