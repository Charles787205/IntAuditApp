'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import UploadUpdates from '@/components/handover/UploadUpdates';
import ParcelEventLogsModal from '@/components/ParcelEventLogsModal';

interface Handover {
  id: number;
  handover_date: string;
  quantity: number;
  status: 'pending' | 'done'; // Add status field
  date_added: string;
  platform: string;
  file_name: string;
  totalParcels: number;
}

interface Parcel {
  id: number;
  tracking_number: string;
  port_code: string;
  package_type: string;
  direction: 'forward' | 'reverse';
  updated_by: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function HandoverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [handover, setHandover] = useState<Handover | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedParcelTrackingNumber, setSelectedParcelTrackingNumber] = useState<string>('');
  const [showEventLogsModal, setShowEventLogsModal] = useState(false);
  
  // Applied filters (what's actually being used for filtering)
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [updatedByFilters, setUpdatedByFilters] = useState<string[]>([]);
  const [directionFilter, setDirectionFilter] = useState<string>('');
  
  // Temporary filters (what's selected in the dropdown but not yet applied)
  const [tempStatusFilters, setTempStatusFilters] = useState<string[]>([]);
  const [tempUpdatedByFilters, setTempUpdatedByFilters] = useState<string[]>([]);
  
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableUpdatedBy, setAvailableUpdatedBy] = useState<string[]>([]);
  const [availableDirections, setAvailableDirections] = useState<string[]>([]);
  
  // Dropdown states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showUpdatedByDropdown, setShowUpdatedByDropdown] = useState(false);
  
  // Refs for dropdown management
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const updatedByDropdownRef = useRef<HTMLDivElement>(null);

  const fetchHandoverDetails = async (page: number = currentPage, resetPage: boolean = false, isFilterChange: boolean = false) => {
    if (!params.id) return;
    
    // Only show table loading for filter changes, pagination, or items per page changes
    if (isFilterChange || !isLoading) {
      setIsTableLoading(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const queryParams = new URLSearchParams({
        page: resetPage ? '1' : page.toString(),
        limit: itemsPerPage.toString(),
        ...(statusFilters.length > 0 && { status: statusFilters.join(',') }),
        ...(updatedByFilters.length > 0 && { updated_by: updatedByFilters.join(',') }),
        ...(directionFilter && { direction: directionFilter })
      });

      const response = await fetch(
        `/api/handovers/${params.id}?${queryParams.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        // Only update handover info on initial load
        if (isLoading) {
          setHandover(data.handover);
        }
        
        setParcels(data.parcels);
        setPagination(data.pagination);
        setAvailableStatuses(data.availableStatuses || []);
        setAvailableUpdatedBy(data.availableUpdatedBy || []);
        setAvailableDirections(data.availableDirections || []);
        
        if (resetPage) {
          setCurrentPage(1);
        }
      } else {
        console.error('Failed to fetch handover details:', data.error);
      }
    } catch (error) {
      console.error('Error fetching handover details:', error);
    } finally {
      setIsLoading(false);
      setIsTableLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchHandoverDetails(1, true);
  }, [params.id]);

  // Filter and pagination changes
  useEffect(() => {
    if (!isLoading) { // Only run after initial load
      fetchHandoverDetails(1, true, true);
    }
  }, [statusFilters, updatedByFilters, directionFilter, itemsPerPage]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        if (showStatusDropdown) {
          setStatusFilters([...tempStatusFilters]);
          setShowStatusDropdown(false);
        }
      }
      if (updatedByDropdownRef.current && !updatedByDropdownRef.current.contains(event.target as Node)) {
        if (showUpdatedByDropdown) {
          setUpdatedByFilters([...tempUpdatedByFilters]);
          setShowUpdatedByDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown, showUpdatedByDropdown, tempStatusFilters, tempUpdatedByFilters]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchHandoverDetails(page, false, true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      in_linehaul: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      delivery_attempt_successful: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      returned_to_sender: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.in_linehaul}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
      </span>
    );
  };

  const getDirectionBadge = (direction: 'forward' | 'reverse') => {
    const directionStyles = {
      forward: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      reverse: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${directionStyles[direction]}`}>
        {direction.charAt(0).toUpperCase() + direction.slice(1)}
      </span>
    );
  };

  const Pagination = ({ pagination }: { pagination: Pagination }) => {
    const getPageNumbers = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (
        let i = Math.max(2, pagination.currentPage - delta);
        i <= Math.min(pagination.totalPages - 1, pagination.currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (pagination.currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (pagination.currentPage + delta < pagination.totalPages - 1) {
        rangeWithDots.push('...', pagination.totalPages);
      } else {
        rangeWithDots.push(pagination.totalPages);
      }

      return rangeWithDots;
    };

    if (pagination.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="relative inline-flex items-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Showing{' '}
              <span className="font-medium">
                {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
              </span>{' '}
              of <span className="font-medium">{pagination.totalItems}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              
              {getPageNumbers().map((pageNumber, index) => (
                <button
                  key={index}
                  onClick={() => typeof pageNumber === 'number' ? handlePageChange(pageNumber) : undefined}
                  disabled={pageNumber === '...'}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    pageNumber === pagination.currentPage
                      ? 'z-10 bg-blue-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                      : pageNumber === '...'
                      ? 'text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-300 dark:ring-slate-600'
                      : 'text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!handover) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Handover Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">The handover you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/handovers')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Handovers
          </button>
        </div>
      </div>
    );
  }

  const handleUploadSuccess = () => {
    // Refresh the parcel data after successful upload
    fetchHandoverDetails(currentPage);
    setShowUploadModal(false);
  };

  const handleStatusDropdownToggle = () => {
    if (!showStatusDropdown) {
      setTempStatusFilters([...statusFilters]);
    }
    setShowStatusDropdown(!showStatusDropdown);
  };

  const handleUpdatedByDropdownToggle = () => {
    if (!showUpdatedByDropdown) {
      setTempUpdatedByFilters([...updatedByFilters]);
    }
    setShowUpdatedByDropdown(!showUpdatedByDropdown);
  };

  const handleTempStatusFilterChange = (status: string, checked: boolean) => {
    if (checked) {
      setTempStatusFilters(prev => [...prev, status]);
    } else {
      setTempStatusFilters(prev => prev.filter(s => s !== status));
    }
  };

  const handleTempUpdatedByFilterChange = (updatedBy: string, checked: boolean) => {
    if (checked) {
      setTempUpdatedByFilters(prev => [...prev, updatedBy]);
    } else {
      setTempUpdatedByFilters(prev => prev.filter(u => u !== updatedBy));
    }
  };

  const clearAllFilters = () => {
    setStatusFilters([]);
    setUpdatedByFilters([]);
    setDirectionFilter('');
    setTempStatusFilters([]);
    setTempUpdatedByFilters([]);
  };

  const handleParcelClick = (trackingNumber: string) => {
    setSelectedParcelTrackingNumber(trackingNumber);
    setShowEventLogsModal(true);
  };

  const closeEventLogsModal = () => {
    setShowEventLogsModal(false);
    setSelectedParcelTrackingNumber('');
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/handovers')}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Handover Details
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {handover.file_name}
            </p>
          </div>
        </div>
      </div>

      {/* Handover Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Handover Date</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {new Date(handover.handover_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Parcels</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{handover.totalParcels}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${handover.status === 'done' 
              ? 'bg-green-100 dark:bg-green-900/20' 
              : 'bg-yellow-100 dark:bg-yellow-900/20'}`}>
              <svg className={`w-5 h-5 ${handover.status === 'done' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-yellow-600 dark:text-yellow-400'}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {handover.status === 'done' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-900 dark:text-white capitalize">
                  {handover.status}
                </p>
                <button
                  onClick={async () => {
                    const newStatus = handover.status === 'pending' ? 'done' : 'pending';
                    try {
                      const response = await fetch(`/api/handovers/${handover.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                      });
                      
                      if (response.ok) {
                        setHandover(prev => prev ? { ...prev, status: newStatus } : null);
                      } else {
                        alert('Failed to update status');
                      }
                    } catch (error) {
                      console.error('Error updating status:', error);
                      alert('Error updating status');
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    handover.status === 'pending'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  Mark as {handover.status === 'pending' ? 'Done' : 'Pending'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 2h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Platform</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white capitalize">{handover.platform}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Created</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {new Date(handover.date_added).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <div className="relative">
              <button
                onClick={handleStatusDropdownToggle}
                className="w-full text-left bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between"
              >
                <span>
                  {tempStatusFilters.length > 0
                    ? `Selected: ${tempStatusFilters.join(', ')}`
                    : 'Select Status'}
                </span>
                <svg className={`w-5 h-5 transition-transform ${showStatusDropdown ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {showStatusDropdown && (
                <div ref={statusDropdownRef} className="absolute z-10 mt-2 w-full rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
                  <div className="p-4">
                    {availableStatuses.map((status) => (
                      <div key={status} className="flex items-center mb-2">
                        <input
                          id={`status-filter-${status}`}
                          type="checkbox"
                          checked={tempStatusFilters.includes(status)}
                          onChange={(e) => handleTempStatusFilterChange(status, e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        <label
                          htmlFor={`status-filter-${status}`}
                          className="ml-2 block text-sm text-slate-700 dark:text-slate-300"
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Updated By Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Updated By
            </label>
            <div className="relative">
              <button
                onClick={handleUpdatedByDropdownToggle}
                className="w-full text-left bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between"
              >
                <span>
                  {tempUpdatedByFilters.length > 0
                    ? `Selected: ${tempUpdatedByFilters.join(', ')}`
                    : 'Select Updated By'}
                </span>
                <svg className={`w-5 h-5 transition-transform ${showUpdatedByDropdown ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {showUpdatedByDropdown && (
                <div ref={updatedByDropdownRef} className="absolute z-10 mt-2 w-full rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
                  <div className="p-4">
                    {availableUpdatedBy.map((user) => (
                      <div key={user} className="flex items-center">
                        <input
                          id={`updated-by-filter-${user}`}
                          type="checkbox"
                          checked={tempUpdatedByFilters.includes(user)}
                          onChange={(e) => handleTempUpdatedByFilterChange(user, e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        <label
                          htmlFor={`updated-by-filter-${user}`}
                          className="ml-2 block text-sm text-slate-700 dark:text-slate-300"
                        >
                          {user}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Direction Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Direction
            </label>
            <div className="relative">
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <option value="">Select Direction</option>
                {availableDirections.map((direction) => (
                  <option key={direction} value={direction}>
                    {direction.charAt(0).toUpperCase() + direction.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Parcels Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Parcels</h2>
          <div className="flex items-center space-x-4">
            {/* Items per page dropdown */}
            <label className="text-sm text-slate-600 dark:text-slate-400">
              Show:
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="ml-2 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-slate-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </label>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {isTableLoading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex items-center justify-center z-10">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Loading...</span>
              </div>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tracking Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Port Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Package Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Updated By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Direction
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {parcels.map((parcel,index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleParcelClick(parcel.tracking_number)}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      {parcel.tracking_number}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">
                      {parcel.port_code || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">
                      {parcel.package_type || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(parcel.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {parcel.updated_by}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(parcel.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getDirectionBadge(parcel.direction as 'forward' | 'reverse')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && <Pagination pagination={pagination} />}
      </div>

      {/* Upload Updates Modal */}
      <UploadUpdates
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        handoverId={handover?.id}
        onSuccess={handleUploadSuccess}
      />

      {/* Event Logs Modal */}
      <ParcelEventLogsModal
        isOpen={showEventLogsModal}
        onClose={closeEventLogsModal}
        trackingNumber={selectedParcelTrackingNumber}
      />
    </div>
  );
}