'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/components/NotificationProvider';

interface UpdateParcelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: any;
}

export default function UpdateParcelsModal({ isOpen, onClose, onSuccess }: UpdateParcelsModalProps) {
  const [curlCommand, setCurlCommand] = useState('');
  const [trackingNumbers, setTrackingNumbers] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [storedHeaders, setStoredHeaders] = useState<Record<string, string> | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const { addNotification, updateNotification, removeNotification } = useNotifications();

  // Load stored headers on component mount
  useEffect(() => {
    const saved = localStorage.getItem('shopee-auth-headers');
    if (saved) {
      try {
        setStoredHeaders(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse stored headers:', e);
        localStorage.removeItem('shopee-auth-headers');
      }
    } else {
      setNeedsAuth(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  const extractHeadersFromCurl = (curl: string): Record<string, string> | null => {
    try {
      console.log('Input curl command:', curl);
      
      // First, clean up the curl command by removing line breaks and extra spaces
      const cleanedCurl = curl
        .replace(/\\\s*[\r\n]+\s*/g, ' ')  // Replace backslash + newline with space
        .replace(/\s+/g, ' ')              // Replace multiple spaces with single space
        .trim();
      
      console.log('Cleaned curl command:', cleanedCurl);
      
      const headers: Record<string, string> = {};

      // Extract all -H headers using a comprehensive approach
      // First, find all -H patterns and their positions
      const headerPattern = /-H\s*['"]([^'"]+)['"]/g;
      let match;
      
      console.log('Debug: Starting header extraction with pattern:', headerPattern.source);
      
      while ((match = headerPattern.exec(cleanedCurl)) !== null) {
        const headerString = match[1];
        console.log('Debug: Found header string:', headerString);
        
        // Parse the header name and value
        const colonIndex = headerString.indexOf(':');
        if (colonIndex > 0) {
          const headerName = headerString.substring(0, colonIndex).trim();
          const headerValue = headerString.substring(colonIndex + 1).trim();
          const headerNameLower = headerName.toLowerCase();
          
          console.log(`Debug: Parsed header - Name: "${headerName}", Value: "${headerValue}"`);
          
          // Check if this is an auth-related header
          const isAuthHeader = 
            headerNameLower === 'cookie' ||
            headerNameLower === 'x-csrftoken' ||
            headerNameLower === 'x-sap-ri' ||
            headerNameLower === 'x-sap-sec' ||
            headerNameLower === 'device-id' ||
            headerNameLower.includes('csrf');
          
          if (isAuthHeader) {
            console.log(`✓ Adding auth header: ${headerName} = ${headerValue.substring(0, 50)}...`);
            headers[headerName] = headerValue;
          } else {
            console.log(`✗ Skipping non-auth header: ${headerNameLower}`);
          }
        } else {
          console.log(`Debug: No colon found in header: "${headerString}"`);
        }
      }
      
      // Extract cookie with -b flag
      const cookiePattern = /-b\s*['"]([^'"]+)['"]/;
      const cookieMatch = cleanedCurl.match(cookiePattern);
      if (cookieMatch) {
        console.log('✓ Found -b cookie:', cookieMatch[1].substring(0, 50) + '...');
        headers['cookie'] = cookieMatch[1];
      } else {
        console.log('✗ No -b cookie found');
      }

      console.log('Final extracted headers:', Object.keys(headers));
      console.log('Header details:');
      Object.entries(headers).forEach(([name, value]) => {
        console.log(`  ${name}: ${value.substring(0, 50)}...`);
      });
      
      // Debug: Show what we found
      if (Object.keys(headers).length > 0) {
        console.log('Found cookie header:', !!headers['cookie']);
        console.log('Found x-csrftoken header:', !!headers['x-csrftoken']);
        console.log('Found device-id header:', !!headers['device-id']);
        console.log('Found x-sap-ri header:', !!headers['x-sap-ri']);
        console.log('Found x-sap-sec header:', !!headers['x-sap-sec']);
      }
      
      return Object.keys(headers).length > 0 ? headers : null;
    } catch (error) {
      console.error('Error extracting headers:', error);
      return null;
    }
  };

  const createRequestData = (trackingNumbers: string, authHeaders?: Record<string, string>) => {
    const trackingList = trackingNumbers
      .split(/[,\n\r\t\s]+/)
      .map(tn => tn.trim())
      .filter(tn => tn.length > 0);

    if (trackingList.length === 0) {
      throw new Error('No tracking numbers provided');
    }

    // Use either provided authHeaders or stored headers
    const headersToUse = authHeaders || storedHeaders || {};

    const finalHeaders: Record<string, string> = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.8',
      'app': 'FMS Portal',
      'content-type': 'application/json;charset=UTF-8',
      'origin': 'https://spx.shopee.ph',
      'priority': 'u=1, i',
      'referer': 'https://spx.shopee.ph/',
      'sec-ch-ua': '"Brave";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      // Add auth headers
      ...headersToUse
    };

    console.log('Final headers for request:', finalHeaders);
    console.log('Auth headers being merged:', headersToUse);
    console.log('Has cookie header:', !!finalHeaders.cookie);
    console.log('Has x-csrftoken header:', !!finalHeaders['x-csrftoken']);
    console.log('Has device-id header:', !!finalHeaders['device-id']);

    return {
      url: 'https://spx.shopee.ph/api/fleet_order/order/tracking_list/search',
      method: 'POST',
      headers: finalHeaders,
      data: {
        count: Math.max(24, trackingList.length),
        page_no: 1,
        search_id_list: trackingList
      }
    };
  };

  const executeCurl = async () => {
    if (!trackingNumbers.trim()) {
      setError('Please enter tracking numbers to update');
      return;
    }

    // If we don't have stored headers and need auth, require curl command
    if (needsAuth && !curlCommand.trim()) {
      setError('Please enter a curl command with authorization headers');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Parse tracking numbers
      const trackingList = trackingNumbers
        .split(/[,\n\r\t\s]+/)
        .map(tn => tn.trim())
        .filter(tn => tn.length > 0);

      if (trackingList.length === 0) {
        throw new Error('No tracking numbers provided');
      }

      let authHeaders: Record<string, string> | undefined;

      // If we need new auth headers, extract them from curl command
      if (needsAuth && curlCommand.trim()) {
        const extractedHeaders = extractHeadersFromCurl(curlCommand);
        console.log("Extracted Headers", extractedHeaders);
        if (!extractedHeaders) {
          throw new Error('Failed to extract authorization headers from curl command');
        }
        
        // Save the headers for future use
        setStoredHeaders(extractedHeaders);
        localStorage.setItem('shopee-auth-headers', JSON.stringify(extractedHeaders));
        setNeedsAuth(false);
        authHeaders = extractedHeaders;
      }

      // Process in batches if there are many tracking numbers
      const batchSize = 50; // Process 50 tracking numbers at a time
      const batches = [];
      
      for (let i = 0; i < trackingList.length; i += batchSize) {
        batches.push(trackingList.slice(i, i + batchSize));
      }

      console.log(`Processing ${trackingList.length} tracking numbers in ${batches.length} batches`);

      // If only one batch, process normally without notification
      if (batches.length === 1) {
        const requestData = createRequestData(trackingNumbers, authHeaders);

        const response = await fetch('/api/shopee/update-parcels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const result = await response.json();
        console.log(result);
        
        if (!response.ok) {
          // Check if it's an authentication error
          if (response.status === 401 || response.status === 403 || 
              result.isAuthError || 
              (result.error && (result.error.includes('auth') || result.error.includes('Authentication')))) {
            setNeedsAuth(true);
            setStoredHeaders(null);
            localStorage.removeItem('shopee-auth-headers');
            throw new Error('Authentication failed. Please provide a new curl command with valid headers.');
          }
          throw new Error(result.error || 'Failed to execute request');
        }

        setResult(result);
        
        // Clear curl command after successful use
        if (curlCommand.trim()) {
          setCurlCommand('');
        }
        
        // If successful, call onSuccess to refresh the parcels list
        if (result.success) {
          onSuccess();
        }
        return;
      }

      // Multiple batches - use background processing with notifications
      const notificationId = addNotification({
        type: 'loading',
        title: 'Updating Parcels',
        message: `Processing ${trackingList.length} tracking numbers in ${batches.length} batches...`,
        duration: 0 // Don't auto-hide
      });

      let totalUpdated = 0;
      let totalErrors = 0;
      const errors: string[] = [];

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const progress = Math.round(((batchIndex + 1) / batches.length) * 100);

        // Update progress notification
        updateNotification(notificationId, {
          message: `Processing batch ${batchIndex + 1} of ${batches.length} (${progress}%)...`
        });

        try {
          // Create request data for this batch
          const requestData = createRequestData(batch.join('\n'), authHeaders);

          // Make the request
          const response = await fetch('/api/shopee/update-parcels', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
          });

          const batchResult = await response.json();

          if (!response.ok) {
            // Check if it's an authentication error
            if (response.status === 401 || response.status === 403 || 
                batchResult.isAuthError || 
                (batchResult.error && (batchResult.error.includes('auth') || batchResult.error.includes('Authentication')))) {
              
              // Remove progress notification and show auth error
              removeNotification(notificationId);
              
              setNeedsAuth(true);
              setStoredHeaders(null);
              localStorage.removeItem('shopee-auth-headers');
              throw new Error('Authentication failed. Please provide a new curl command with valid headers.');
            }
            
            errors.push(`Batch ${batchIndex + 1}: ${batchResult.error || 'Unknown error'}`);
            totalErrors += batch.length;
          } else {
            totalUpdated += batchResult.updatedCount || 0;
          }

          // Small delay between requests to avoid overwhelming the API
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (batchError) {
          console.error(`Error processing batch ${batchIndex + 1}:`, batchError);
          errors.push(`Batch ${batchIndex + 1}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
          totalErrors += batch.length;
        }
      }

      // Update final notification
      const finalMessage = `Completed! Updated ${totalUpdated} parcels. ${totalErrors > 0 ? `${totalErrors} failed.` : ''}`;
      updateNotification(notificationId, {
        type: totalErrors === 0 ? 'success' : (totalUpdated > 0 ? 'info' : 'error'),
        title: 'Update Complete',
        message: finalMessage,
        duration: 10000 // Auto-hide after 10 seconds
      });

      // Set result for modal display
      setResult({
        success: totalUpdated > 0,
        updatedCount: totalUpdated,
        totalProcessed: trackingList.length,
        errorCount: totalErrors,
        errors: errors.length > 0 ? errors : undefined
      });

      // Clear curl command after successful use
      if (curlCommand.trim()) {
        setCurlCommand('');
      }
      
      // If any updates were successful, call onSuccess to refresh the parcels list
      if (totalUpdated > 0) {
        onSuccess();
      }

    } catch (error) {
      console.error('Error executing curl:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCurlCommand('');
    setTrackingNumbers('');
    setError(null);
    setResult(null);
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose} 
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative w-full max-w-4xl transform rounded-lg bg-white dark:bg-slate-800 shadow-xl transition-all duration-300 ease-out ${
            isAnimating 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Update Parcels from Shopee API
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
            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {storedHeaders && !needsAuth 
                      ? 'Authorization headers are stored. Enter tracking numbers to update parcel statuses. Large batches (50+ numbers) will be processed in the background with progress notifications.'
                      : 'First time setup: Provide authorization headers by pasting a curl command, then enter tracking numbers to update. Large batches will be processed automatically in chunks.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Tracking Numbers Input */}
            <div>
              <label htmlFor="trackingNumbers" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tracking Numbers
              </label>
              <textarea
                id="trackingNumbers"
                value={trackingNumbers}
                onChange={(e) => setTrackingNumbers(e.target.value)}
                placeholder="Enter tracking numbers (one per line or comma/space separated)&#10;&#10;💡 Tip: You can paste 100+ tracking numbers - they'll be processed automatically in batches of 50&#10;&#10;Example:&#10;speph057870483936&#10;ph2595637614246&#10;ph251452102945f"
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-all duration-200 resize-none"
              />
            </div>

            {/* Curl Command Input - Only show when needed */}
            {needsAuth && (
              <div>
                <label htmlFor="curlCommand" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Authorization Headers (Paste Curl Command)
                </label>
                <textarea
                  id="curlCommand"
                  value={curlCommand}
                  onChange={(e) => setCurlCommand(e.target.value)}
                  placeholder={`Paste the curl command with authorization headers. Only the headers will be extracted:

curl 'https://spx.shopee.ph/api/fleet_order/order/tracking_list/search' \\
  -H 'x-csrftoken: YOUR_CSRF_TOKEN' \\
  -H 'x-sap-ri: YOUR_SAP_RI' \\
  -H 'x-sap-sec: YOUR_SAP_SEC' \\
  -H 'device-id: YOUR_DEVICE_ID' \\
  -b 'cookie=YOUR_COOKIES'`}
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-all duration-200 resize-none font-mono text-sm"
                />
              </div>
            )}

            {/* Auth Status Display */}
            {storedHeaders && !needsAuth && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Authorization headers are saved and ready to use.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setNeedsAuth(true);
                      setStoredHeaders(null);
                      localStorage.removeItem('shopee-auth-headers');
                    }}
                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline"
                  >
                    Update Auth
                  </button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Result Display */}
            {result && (
              <div className={`border rounded-md p-4 ${
                result.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {result.success ? (
                      <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm mb-2 ${
                      result.success 
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {result.success ? 'Update completed!' : 'Update failed!'}
                    </p>
                    
                    {/* Batch processing results */}
                    {result.totalProcessed && (
                      <div className="space-y-1">
                        <p className={`text-sm ${
                          result.success 
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          Processed {result.totalProcessed} tracking numbers
                        </p>
                        {result.updatedCount > 0 && (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            ✓ Updated {result.updatedCount} parcels
                          </p>
                        )}
                        {result.errorCount > 0 && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            ✗ {result.errorCount} failed
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Single batch result (legacy) */}
                    {result.updatedCount && !result.totalProcessed && (
                      <p className={`text-sm ${
                        result.success 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        Updated {result.updatedCount} parcels
                      </p>
                    )}

                    {/* Error details */}
                    {result.errors && result.errors.length > 0 && (
                      <details className="mt-3">
                        <summary className="text-sm font-medium text-red-700 dark:text-red-300 cursor-pointer hover:text-red-800 dark:hover:text-red-200">
                          View Error Details ({result.errors.length} errors)
                        </summary>
                        <div className="mt-2 space-y-1">
                          {result.errors.map((error: string, index: number) => (
                            <p key={index} className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                              {error}
                            </p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={executeCurl}
              disabled={isProcessing || !trackingNumbers.trim() || (needsAuth && !curlCommand.trim())}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Processing...
                </>
              ) : (
                'Execute Update'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
