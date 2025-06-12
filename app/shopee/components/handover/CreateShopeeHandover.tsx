'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface HandoverData {
  trackingNo: string;
}

interface SheetHandover {
  date: string;
  sheetName: string;
  data: HandoverData[];
}

interface CreateShopeeHandoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { 
    file: File; 
    handovers: SheetHandover[];
  }) => void;
}

export default function CreateShopeeHandover({ isOpen, onClose, onSave }: CreateShopeeHandoverProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [handovers, setHandovers] = useState<SheetHandover[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError('');
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const extractedHandovers: SheetHandover[] = [];

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        
        // For Shopee, we extract from A12 to B:B (columns A and B, starting from row 12)
        const extractedData: HandoverData[] = [];
        const trackingNumbers = new Set<string>(); // To track duplicates
        
        // Start from row 12 (0-indexed = 11)
        let rowIndex = 11; // A12 starts at row index 11
        
        while (true) {
          // Get values from columns A and B
          const cellA = worksheet[`A${rowIndex + 1}`]; // +1 because Excel is 1-indexed
          const cellB = worksheet[`B${rowIndex + 1}`];
          
          // If both cells are empty, we've reached the end
          if (!cellA && !cellB) break;
          
          // Extract tracking number from either column A or B
          let trackingNo = '';
          if (cellA?.v) {
            trackingNo = cellA.v.toString().trim();
          } else if (cellB?.v) {
            trackingNo = cellB.v.toString().trim();
          }
          
          // If we have a tracking number and it's not a duplicate, add it
          if (trackingNo && !trackingNumbers.has(trackingNo)) {
            trackingNumbers.add(trackingNo);
            extractedData.push({
              trackingNo
            });
          }
          
          rowIndex++;
          
          // Safety check to prevent infinite loop (max 10000 rows)
          if (rowIndex > 10011) break; // 12 + 10000
        }

        if (extractedData.length > 0) {
          // Parse date from sheet name (e.g., "June 1", "June 2")
          const dateFromSheet = parseSheetNameToDate(sheetName);
          
          extractedHandovers.push({
            date: dateFromSheet,
            sheetName,
            data: extractedData
          });
        }
      }

      if (extractedHandovers.length === 0) {
        throw new Error('No valid tracking numbers found in any sheets (looking in range A12 to B:B)');
      }

      setHandovers(extractedHandovers);
    } catch (error) {
      console.error('Error processing file:', error);
      setError(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseSheetNameToDate = (sheetName: string): string => {
    // Try to parse sheet names like "June 1", "June 2", etc.
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    const currentYear = new Date().getFullYear();
    
    // Clean the sheet name
    const cleanSheetName = sheetName.toLowerCase().trim();
    
    // Try to extract month and day
    for (const month of monthNames) {
      if (cleanSheetName.includes(month)) {
        const monthIndex = monthNames.indexOf(month);
        
        // Extract day number
        const dayMatch = cleanSheetName.match(/\d+/);
        const day = dayMatch ? parseInt(dayMatch[0]) : 1;
        
        // Create date
        const date = new Date(currentYear, monthIndex, day);
        return date.toISOString().split('T')[0];
      }
    }
    
    // Fallback to current date if parsing fails
    return new Date().toISOString().split('T')[0];
  };

  const handleSave = () => {
    if (!selectedFile || handovers.length === 0) {
      setError('Please select a file and ensure it contains valid data');
      return;
    }

    onSave({
      file: selectedFile,
      handovers
    });

    // Reset state
    setSelectedFile(null);
    setHandovers([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setHandovers([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const updateHandoverDate = (index: number, newDate: string) => {
    setHandovers(prev => prev.map((handover, i) => 
      i === index ? { ...handover, date: newDate } : handover
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl transform rounded-lg bg-white dark:bg-slate-800 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Create Shopee Handovers
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Upload Excel file with tracking numbers in columns A-B starting from row 12
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Excel File (with multiple sheets)
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500"
                    >
                      Choose Excel file
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Tracking numbers should be in columns A-B starting from row 12. Duplicates will be ignored.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Processing file...</span>
              </div>
            )}

            {/* File Info and Handovers Preview */}
            {selectedFile && handovers.length > 0 && (
              <div className="space-y-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">File Information</h4>
                  <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <p><strong>File:</strong> {selectedFile.name}</p>
                    <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB</p>
                    <p><strong>Handovers found:</strong> {handovers.length}</p>
                    <p><strong>Total records:</strong> {handovers.reduce((sum, h) => sum + h.data.length, 0)}</p>
                  </div>
                </div>

                {/* Handovers List */}
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3">Handovers to Create</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {handovers.map((handover, index) => (
                      <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-slate-900 dark:text-white">
                            Sheet: {handover.sheetName}
                          </h5>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {handover.data.length} records
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Handover Date
                            </label>
                            <input
                              type="date"
                              value={handover.date}
                              onChange={(e) => updateHandoverDate(index, e.target.value)}
                              className="w-full px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                          
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            <div>Tracking Numbers: {handover.data.length}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedFile || handovers.length === 0 || isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-md"
            >
              Create {handovers.length} Handover{handovers.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}