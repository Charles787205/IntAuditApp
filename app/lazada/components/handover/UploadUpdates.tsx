'use client';

import { useState } from 'react';
import { useNotifications } from '../NotificationProvider';

interface UploadUpdatesProps {
  isOpen: boolean;
  onClose: () => void;
  handoverId?: number; // Made optional for global uploads
  onSuccess: () => void;
}

interface UpdateRecord {
  tracking_number: string;
  status?: string;
  updated_by?: string;
  updated_at?: string;
  sub_direction?: string;
}

export default function UploadUpdates({ isOpen, onClose, handoverId, onSuccess }: UploadUpdatesProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [previewData, setPreviewData] = useState<UpdateRecord[]>([]);
  
  const { addNotification, updateNotification } = useNotifications();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setUploadStatus('idle');
      setUploadMessage('');
      
      // Preview the CSV data
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        
        // Use the same robust CSV parser as the API
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          let i = 0;
          
          while (i < line.length) {
            const char = line[i];
            
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i += 2;
              } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
              }
            } else if (char === ',' && !inQuotes) {
              // Field separator
              result.push(current.trim());
              current = '';
              i++;
            } else {
              current += char;
              i++;
            }
          }
          
          // Add the last field
          result.push(current.trim());
          return result;
        };
        
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          console.log('CSV file must contain headers and at least one data row');
          setPreviewData([]);
          return;
        }

        // Parse headers and normalize them (same as API)
        const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
        
        // Find column indices dynamically (same logic as API)
        const trackingIndex = 0; // Always first column as requested
        const statusIndex = headers.findIndex(h => h.includes('tplstatus'));
        const updatedByIndex = headers.findIndex(h => h.includes('laststatusupdatedbyname'));
        const updatedAtIndex = headers.findIndex(h => h.includes('laststatusupdatedat'));
        const directionIndex = headers.findIndex(h => h.includes('direction') || h.includes('subdirection'));

        console.log('CSV Headers:', headers);
        console.log('Column indices:', { trackingIndex, statusIndex, updatedByIndex, updatedAtIndex, directionIndex });
        
        const data = lines.slice(1, 6).map((line, lineIndex) => { // Preview first 5 rows
          const values = parseCSVLine(line);
          console.log(line)
          
          // More comprehensive quote removal for tracking number (same as API)
          let trackingNumber = values[trackingIndex] || '';
          
          // Remove all types of quotes from start and end
          trackingNumber = trackingNumber
            .replace(/^["'`]+|["'`]+$/g, '') // Remove single, double, and backticks from start/end
            .replace(/^"""+|"""+$/g, '') // Remove multiple double quotes
            .replace(/^'''|'''$/g, '') // Remove triple single quotes
            .replace(/^\s+|\s+$/g, ''); // Remove any remaining whitespace
          
          // Additional cleaning - remove any remaining quotes that might be wrapped around the entire value
          if ((trackingNumber.startsWith('"') && trackingNumber.endsWith('"')) ||
              (trackingNumber.startsWith("'") && trackingNumber.endsWith("'"))) {
            trackingNumber = trackingNumber.slice(1, -1);
          }
          
          trackingNumber = trackingNumber.trim();
          
          if (!trackingNumber) return null;

          const record: UpdateRecord = { 
            tracking_number: trackingNumber
          };
          
          // Get status if column exists (same logic as API)
          if (statusIndex >= 0 && values[statusIndex]) {
            record.status = values[statusIndex];
          }

          // Get direction if column exists (same logic as API)
          if (directionIndex >= 0 && values[directionIndex]) {
            const directionValue = values[directionIndex].toLowerCase();
            // Map the direction value to our enum
            if (directionValue === 'reverse' || directionValue === 'backward') {
              record.sub_direction = 'reverse';
            } else if (directionValue === 'forward') {
              record.sub_direction = 'forward';
            } else {
              record.sub_direction = values[directionIndex]; // Show original value
            }
          }
          console.log("values", values)
          // Get updated_by (same logic as API)
          const updatedBy = (updatedByIndex >= 0 && values[updatedByIndex]) 
            ? values[updatedByIndex] 
            : 'Global CSV Upload';
          record.updated_by = updatedBy;

          // Use provided updated_at or current time (same logic as API)
          if (updatedAtIndex >= 0 && values[updatedAtIndex]) {
            try {
              record.updated_at = new Date(values[updatedAtIndex]).toISOString();
            } catch {
              record.updated_at = new Date().toISOString();
            }
          } else {
            record.updated_at = new Date().toISOString();
          }
          
          console.log(`Mapped record ${lineIndex + 1}:`, record);
          
          return record;
        }).filter(record => record !== null);
        
        console.log('Final preview data:', data);
        setPreviewData(data);
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid CSV file');
      setSelectedFile(null);
      setPreviewData([]);
    }
  };

  const pollJobStatus = async (jobId: string, notificationId: string, isHandover: boolean = false) => {
    try {
      const endpoint = isHandover 
        ? `/api/handovers/${handoverId}/upload-updates?jobId=${jobId}`
        : `/api/upload-updates?jobId=${jobId}`;
      
      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success) {
        if (result.status === 'processing') {
          // Update progress
          const uploadType = isHandover ? `handover ${handoverId}` : 'all handovers';
          updateNotification(notificationId, {
            title: `Uploading CSV... ${result.progress}%`,
            message: `Processing ${selectedFile?.name} for ${uploadType}...`
          });
          
          // Continue polling
          setTimeout(() => pollJobStatus(jobId, notificationId, isHandover), 2000);
        } else if (result.status === 'completed') {
          // Success
          const uploadType = isHandover ? `handover ${handoverId}` : 'all handovers';
          updateNotification(notificationId, {
            type: 'success',
            title: 'Upload Complete!',
            message: `Successfully updated ${result.result.updatedCount} parcels in ${uploadType}`,
            duration: 5000
          });
          
          onSuccess(); // Refresh the data
        } else if (result.status === 'failed') {
          // Error
          updateNotification(notificationId, {
            type: 'error',
            title: 'Upload Failed',
            message: result.error || 'An error occurred during upload',
            duration: 10000
          });
        }
      }
    } catch (error) {
      updateNotification(notificationId, {
        type: 'error',
        title: 'Upload Failed',
        message: 'Network error while checking upload status',
        duration: 10000
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Use global or specific handover endpoint
      const endpoint = handoverId 
        ? `/api/handovers/${handoverId}/upload-updates`
        : '/api/upload-updates';
      
      if (handoverId) {
        formData.append('handoverId', handoverId.toString());
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.jobId) {
        // Background processing started (works for both global and handover uploads now)
        const uploadType = handoverId ? `handover ${handoverId}` : 'all handovers';
        const notificationId = addNotification({
          type: 'loading',
          title: 'Starting Upload...',
          message: `Processing ${selectedFile.name} for ${uploadType}...`,
          duration: 0 // Don't auto-hide
        });

        // Close the modal immediately since processing is in background
        handleClose();
        
        // Start polling for job status (pass handover flag)
        pollJobStatus(result.jobId, notificationId, !!handoverId);
      } else if (result.success) {
        // Fallback for old synchronous response (if any endpoints still use it)
        setUploadStatus('success');
        const message = handoverId 
          ? `Successfully updated ${result.updatedCount} parcels in this handover`
          : `Successfully updated ${result.updatedCount} parcels across all handovers`;
        setUploadMessage(message);
        
        addNotification({
          type: 'success',
          title: 'Upload Complete!',
          message,
          duration: 5000
        });
        
        onSuccess(); // Refresh the data
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setUploadStatus('error');
        setUploadMessage(result.error || 'Upload failed');
        
        addNotification({
          type: 'error',
          title: 'Upload Failed',
          message: result.error || 'Upload failed',
          duration: 10000
        });
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('Network error occurred');
      console.error('Upload error:', error);
      
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Network error occurred',
        duration: 10000
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setUploadStatus('idle');
    setUploadMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform rounded-lg bg-white dark:bg-slate-800 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {handoverId ? 'Upload Updates for Handover' : 'Upload Global Updates'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {handoverId 
                  ? 'Upload a CSV file to update parcel information for this handover'
                  : 'Upload a CSV file to update tracking numbers across all handovers. Processing will continue in the background.'
                }
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
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                      {selectedFile ? selectedFile.name : 'Choose CSV file'}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      CSV files only. Expected columns: tracking_number, status, updated_by, updated_at
                    </span>
                  </label>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
                  >
                    Select File
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Data */}
            {previewData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
                  Preview (first 5 rows)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Tracking Number</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Sub Direction</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Updated By</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Updated At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {previewData.map((record, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-slate-900 dark:text-white">{record.tracking_number}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-white">{record.sub_direction || '-'}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-white">{record.status || '-'}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-white">{record.updated_by || '-'}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-white">{record.updated_at || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Status Messages - Only show for handover-specific uploads */}
            {handoverId && uploadStatus === 'success' && (
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-400">
                      {uploadMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {handoverId && uploadStatus === 'error' && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">
                      {uploadMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Starting Upload...' : 'Upload Updates'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}