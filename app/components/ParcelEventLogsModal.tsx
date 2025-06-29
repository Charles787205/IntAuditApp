'use client';

import { useState, useEffect } from 'react';

interface ParcelEventLog {
  id: number;
  tracking_number: string;
  from_status: string;
  new_status: string;
  updated_by: string;
  created_at: string;
}

interface ParcelEventLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingNumber: string;
}

export default function ParcelEventLogsModal({ 
  isOpen, 
  onClose, 
  trackingNumber 
}: ParcelEventLogsModalProps) {
  const [eventLogs, setEventLogs] = useState<ParcelEventLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch event logs when modal opens
  useEffect(() => {
    if (isOpen && trackingNumber) {
      fetchEventLogs();
    }
  }, [isOpen, trackingNumber]);

  const fetchEventLogs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/parcels/${trackingNumber}/event-logs`);
      const data = await response.json();

      if (data.success) {
        setEventLogs(data.data);
      } else {
        setError(data.error || 'Failed to fetch event logs');
      }
    } catch (error) {
      console.error('Error fetching event logs:', error);
      setError('Failed to fetch event logs');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: { [key: string]: string } = {
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      in_linehaul: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      in_transit: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      out_for_delivery: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusStyles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      }`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Event Logs
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Tracking Number: <span className="font-medium">{trackingNumber}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Error Loading Event Logs</h3>
                <p className="text-slate-600 dark:text-slate-400">{error}</p>
                <button
                  onClick={fetchEventLogs}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : eventLogs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Event Logs Found</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  There are no event logs recorded for this tracking number.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Event logs timeline */}
                <div className="relative">
                  {eventLogs.map((log, index) => (
                    <div key={log.id} className="relative flex items-start space-x-4 pb-8">
                      {/* Timeline line */}
                      {index < eventLogs.length - 1 && (
                        <div className="absolute left-4 top-8 w-0.5 h-full bg-slate-200 dark:bg-slate-600" />
                      )}
                      
                      {/* Timeline dot */}
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>

                      {/* Event content */}
                      <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {log.from_status && (
                              <>
                                {getStatusBadge(log.from_status)}
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </>
                            )}
                            {getStatusBadge(log.new_status)}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            #{log.id}
                          </span>
                        </div>
                        
                        <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                          {log.from_status ? (
                            <>Status changed from <strong>{log.from_status.replace('_', ' ')}</strong> to <strong>{log.new_status.replace('_', ' ')}</strong></>
                          ) : (
                            <>Initial status set to <strong>{log.new_status.replace('_', ' ')}</strong></>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Updated by: <strong>{log.updated_by}</strong></span>
                          <span>{formatDate(log.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}