'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface HandoverData {
  trackingNo: string;
  portCode: string;
  packageType: string;
}

interface CreateNewHandoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (handoverData: { 
    file: File | null; 
    date: string;
    extractedData?: HandoverData[];
    type: string; // Add type field
  }) => void;
}

export default function CreateNewHandover({ isOpen, onClose, onSave }: CreateNewHandoverProps) {
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState('');
  const [extractedData, setExtractedData] = useState<HandoverData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to ensure the element is rendered before animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  // Function to extract date from filename
  const extractDateFromFilename = (filename: string): string => {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.(xlsx|xls)$/i, '');
    
    // Look for date patterns in various formats
    const patterns = [
      // Pattern like "6-03-25" or "06-03-25" 
      /(\d{1,2})-(\d{1,2})-(\d{2,4})$/,
      // Pattern like "6_03_25" or "06_03_25"
      /(\d{1,2})_(\d{1,2})_(\d{2,4})$/,
      // Pattern like "060325"
      /(\d{2})(\d{2})(\d{2})$/,
      // Pattern like "20250603"
      /(\d{4})(\d{2})(\d{2})$/,
    ];

    for (const pattern of patterns) {
      const match = nameWithoutExt.match(pattern);
      if (match) {
        let month, day, year;
        
        if (pattern === patterns[3]) { // YYYYMMDD format
          year = match[1];
          month = match[2];
          day = match[3];
        } else if (pattern === patterns[2]) { // DDMMYY format
          day = match[1];
          month = match[2];
          year = match[3];
          // Convert 2-digit year to 4-digit
          year = year.length === 2 ? `20${year}` : year;
        } else { // MM-DD-YY or DD-MM-YY format (assume MM-DD-YY for US format)
          month = match[1];
          day = match[2];
          year = match[3];
          // Convert 2-digit year to 4-digit
          year = year.length === 2 ? `20${year}` : year;
        }

        // Pad single digits
        month = month.padStart(2, '0');
        day = day.padStart(2, '0');
        
        // Validate date ranges
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    return ''; // Return empty string if no valid date found
  };

  const processXlsxFile = async (file: File): Promise<HandoverData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Find the "DATA HANDOVER" sheet
          const dataHandoverSheet = workbook.SheetNames.find(
            name => name.toUpperCase().includes('DATA HANDOVER')
          );
          
          if (!dataHandoverSheet) {
            reject(new Error('Could not find "DATA HANDOVER" sheet in the file'));
            return;
          }
          
          const worksheet = workbook.Sheets[dataHandoverSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Extract data starting from row 2 (skip header)
          const extractedData: HandoverData[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            
            // Skip empty rows
            if (!row || row.length === 0 || !row[0]) continue;
            
            const trackingNo = row[0]?.toString().trim() || '';
            const portCode = row[2]?.toString().trim() || ''; // Column 3 (index 2)
            const packageType = row[3]?.toString().trim() || ''; // Column 4 (index 3)
            
            if (trackingNo) {
              extractedData.push({
                trackingNo,
                portCode,
                packageType
              });
            }
          }
          
          resolve(extractedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read the file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setProcessingError(null);
      
      // Try to extract date from filename and set it if date field is empty
      if (!date) {
        const extractedDate = extractDateFromFilename(selectedFile.name);
        if (extractedDate) {
          setDate(extractedDate);
        }
      }
      
      // Check if it's an XLSX file
      if (selectedFile.name.toLowerCase().endsWith('.xlsx') || 
          selectedFile.name.toLowerCase().endsWith('.xls')) {
        setIsProcessing(true);
        try {
          const data = await processXlsxFile(selectedFile);
          setExtractedData(data);
          console.log('Extracted data:', data);
        } catch (error) {
          console.error('Error processing file:', error);
          setProcessingError(error instanceof Error ? error.message : 'Failed to process file');
        } finally {
          setIsProcessing(false);
        }
      } else {
        setExtractedData([]);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setProcessingError(null);
      
      // Try to extract date from filename and set it if date field is empty
      if (!date) {
        const extractedDate = extractDateFromFilename(selectedFile.name);
        if (extractedDate) {
          setDate(extractedDate);
        }
      }
      
      // Check if it's an XLSX file
      if (selectedFile.name.toLowerCase().endsWith('.xlsx') || 
          selectedFile.name.toLowerCase().endsWith('.xls')) {
        setIsProcessing(true);
        try {
          const data = await processXlsxFile(selectedFile);
          setExtractedData(data);
          console.log('Extracted data:', data);
        } catch (error) {
          console.error('Error processing file:', error);
          setProcessingError(error instanceof Error ? error.message : 'Failed to process file');
        } finally {
          setIsProcessing(false);
        }
      } else {
        setExtractedData([]);
      }
    }
  };

  const handleSave = () => {
    if (!date) {
      alert('Please select a date');
      return;
    }
    if (!file) {
      alert('Please upload a handover file');
      return;
    }

    onSave({ file, date, extractedData, type: 'shopee' }); // Set type to 'shopee'
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setDate('');
    setExtractedData([]);
    setIsProcessing(false);
    setProcessingError(null);
    setDragActive(false);
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with fade animation */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose} 
      />
      
      {/* Modal with scale and fade animation */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative w-full max-w-md transform rounded-lg bg-white dark:bg-slate-800 shadow-xl transition-all duration-300 ease-out ${
            isAnimating 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Create New Handover
            </h3>
            <button
              onClick={handleClose}
              className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Date Input with focus animation */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Handover Date
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-all duration-200"
              />
            </div>

            {/* File Upload with enhanced animations */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Upload Handover File (XLSX/XLS)
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-300 ease-out ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-105 shadow-lg'
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".xlsx,.xls"
                />
                <div className="text-center">
                  {isProcessing ? (
                    <div className="space-y-2 animate-pulse">
                      <svg className="mx-auto h-12 w-12 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Processing XLSX file...
                      </div>
                    </div>
                  ) : file ? (
                    <div className="space-y-2 animate-fadeIn">
                      <svg className="mx-auto h-12 w-12 text-green-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-900 dark:text-white">{file.name}</span>
                        <br />
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        {extractedData.length > 0 && (
                          <>
                            <br />
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              ✓ {extractedData.length} records extracted
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg 
                        className={`mx-auto h-12 w-12 text-slate-400 transition-transform duration-200 ${
                          dragActive ? 'scale-110' : 'hover:scale-105'
                        }`} 
                        stroke="currentColor" 
                        fill="none" 
                        viewBox="0 0 48 48"
                      >
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">Click to upload</span> or drag and drop
                        <br />
                        XLSX, XLS files
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {processingError && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {processingError}
                  </p>
                </div>
              )}
              
              {extractedData.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                    Preview of extracted data ({extractedData.length} records):
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    <div className="text-xs space-y-1">
                      {extractedData.slice(0, 5).map((item, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2 text-green-700 dark:text-green-400">
                          <span className="truncate">{item.trackingNo}</span>
                          <span className="truncate">{item.portCode}</span>
                          <span className="truncate">{item.packageType}</span>
                        </div>
                      ))}
                      {extractedData.length > 5 && (
                        <div className="text-green-600 dark:text-green-500 italic">
                          ... and {extractedData.length - 5} more records
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer with button animations */}
          <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg"
            >
              Create Handover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}