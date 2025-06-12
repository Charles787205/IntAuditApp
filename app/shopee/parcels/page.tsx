'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ParcelEventLogsModal from '@/components/ParcelEventLogsModal';

interface Handover {
  id: number;
  file_name: string | null;
  handover_date: string;
  status: string;
  platform: string | null;
}

interface Parcel {
  tracking_number: string;
  port_code: string | null;
  package_type: string | null;
  direction: string;
  updated_by: string;
  status: string;
  created_at: string;
  updated_at: string;
  handover_id: number | null;
  handover?: Handover | null;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
  limit: number;
}

interface FilterState {
  search: string;
  statuses: string[];
  direction: string;
  updatedBy: string[];
  handoverId: string;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
}

interface FilterOptions {
  statuses: string[];
  directions: string[];
  updatedBy: string[];
  handovers: Handover[];
}

// Separate component for search params logic
function ParcelsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    statuses: [],
    directions: [],
    updatedBy: [],
    handovers: []
  });
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    statuses: searchParams.getAll('status') || [],
    direction: searchParams.get('direction') || '',
    updatedBy: searchParams.getAll('updatedBy') || [],
    handoverId: searchParams.get('handoverId') || '',
    pageSize: parseInt(searchParams.get('limit') || '20'),
    sortBy: searchParams.get('sortBy') || 'updated_at',
    sortOrder: searchParams.get('sortOrder') || 'desc',
  });

  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1')
  );

  // State for dropdown open/close
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [updatedByDropdownOpen, setUpdatedByDropdownOpen] = useState(false);
  const [selectedParcelTrackingNumber, setSelectedParcelTrackingNumber] = useState<string>('');
  const [showEventLogsModal, setShowEventLogsModal] = useState(false);

  // Refs for click outside detection
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const updatedByDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close status dropdown if clicked outside
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        if (statusDropdownOpen) {
          setStatusDropdownOpen(false);
          // Apply filters when dropdown closes
          const newFilters = { ...filters };
          setCurrentPage(1);
          updateURL(newFilters, 1);
          fetchParcels(1, newFilters);
        }
      }

      // Close updated by dropdown if clicked outside
      if (updatedByDropdownRef.current && !updatedByDropdownRef.current.contains(event.target as Node)) {
        if (updatedByDropdownOpen) {
          setUpdatedByDropdownOpen(false);
          // Apply filters when dropdown closes
          const newFilters = { ...filters };
          setCurrentPage(1);
          updateURL(newFilters, 1);
          fetchParcels(1, newFilters);
        }
      }
    };

    // Add event listener when dropdowns are open
    if (statusDropdownOpen || updatedByDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statusDropdownOpen, updatedByDropdownOpen, filters]);

  // Initialize filters with all options selected by default
  useEffect(() => {
    if (filterOptions.statuses.length > 0 && filterOptions.updatedBy.length > 0) {
      // Only update if URL doesn't have existing filters
      const hasExistingFilters = searchParams.has('status') || searchParams.has('updatedBy');
      
      if (!hasExistingFilters) {
        const defaultFilters = {
          ...filters,
          statuses: filterOptions.statuses,
          updatedBy: filterOptions.updatedBy
        };
        setFilters(defaultFilters);
        fetchParcels(currentPage, defaultFilters);
      }
    }
  }, [filterOptions]);

  const fetchParcels = async (page: number = currentPage, currentFilters: FilterState = filters) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', currentFilters.pageSize.toString());
      params.set('sortBy', currentFilters.sortBy);
      params.set('sortOrder', currentFilters.sortOrder);
      
      // Add platform filter for Shopee
      params.set('platform', 'shopee');
      
      // Handle string filters
      if (currentFilters.search) params.set('search', currentFilters.search);
      if (currentFilters.direction) params.set('direction', currentFilters.direction);
      if (currentFilters.handoverId) params.set('handoverId', currentFilters.handoverId);
      
      // Handle array filters
      currentFilters.statuses.forEach(status => params.append('status', status));
      currentFilters.updatedBy.forEach(updatedBy => params.append('updatedBy', updatedBy));

      const response = await fetch(`/api/parcels?${params}`);
      const data = await response.json();

      if (data.success) {
        setParcels(data.data.parcels);
        setPagination(data.data.pagination);
      } else {
        console.error('Failed to fetch parcels:', data.error);
      }
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch filter options from database
  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/parcels/filters');
      const data = await response.json();
      
      if (data.success) {
        setFilterOptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // Update URL with current filters and page
  const updateURL = (newFilters: FilterState, page: number) => {
    const params = new URLSearchParams();
    
    if (page > 1) params.set('page', page.toString());
    if (newFilters.pageSize !== 20) params.set('limit', newFilters.pageSize.toString());
    if (newFilters.sortBy !== 'updated_at') params.set('sortBy', newFilters.sortBy);
    if (newFilters.sortOrder !== 'desc') params.set('sortOrder', newFilters.sortOrder);
    
    // Handle string filters
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.direction) params.set('direction', newFilters.direction);
    if (newFilters.handoverId) params.set('handoverId', newFilters.handoverId);
    
    // Handle array filters
    newFilters.statuses.forEach(status => params.append('status', status));
    newFilters.updatedBy.forEach(updatedBy => params.append('updatedBy', updatedBy));

    const newURL = `/parcels${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newURL);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string | string[] | number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    updateURL(newFilters, 1);
    fetchParcels(1, newFilters);
  };

  // Handle sorting
  const handleSort = (sortBy: string) => {
    const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    const newFilters = { ...filters, sortBy, sortOrder: newSortOrder };
    setFilters(newFilters);
    updateURL(newFilters, currentPage);
    fetchParcels(currentPage, newFilters);
  };

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateURL(filters, newPage);
    fetchParcels(newPage);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      statuses: filterOptions.statuses, // Select all statuses by default
      direction: '',
      updatedBy: filterOptions.updatedBy, // Select all users by default
      handoverId: '',
      pageSize: 20,
      sortBy: 'updated_at',
      sortOrder: 'desc',
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    updateURL(clearedFilters, 1);
    fetchParcels(1, clearedFilters);
  };

  // Handle checkbox changes for multi-select filters (without immediate API call)
  const handleCheckboxChange = (filterKey: 'statuses' | 'updatedBy', value: string, checked: boolean) => {
    const currentValues = filters[filterKey];
    let newValues: string[];
    
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }
    
    // Update state but don't call API immediately
    setFilters(prev => ({ ...prev, [filterKey]: newValues }));
  };

  // Clear all checkboxes for a specific filter
  const clearCheckboxes = (filterKey: 'statuses' | 'updatedBy') => {
    setFilters(prev => ({ ...prev, [filterKey]: [] }));
  };

  // Select all checkboxes for a specific filter
  const selectAllCheckboxes = (filterKey: 'statuses' | 'updatedBy') => {
    const allOptions = filterKey === 'statuses' ? filterOptions.statuses : filterOptions.updatedBy;
    setFilters(prev => ({ ...prev, [filterKey]: allOptions }));
  };

  // Copy ALL filtered tracking numbers to clipboard (not just current page)
  const copyTrackingNumbers = async () => {
    try {
      // Show loading state
      console.log('Fetching all tracking numbers...');
      
      // Build params for ALL results (same filters, but with high limit and page 1)
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '10000'); // High limit to get all results
      params.set('sortBy', filters.sortBy);
      params.set('sortOrder', filters.sortOrder);
      
      // Apply same filters as current view
      if (filters.search) params.set('search', filters.search);
      if (filters.direction) params.set('direction', filters.direction);
      if (filters.handoverId) params.set('handoverId', filters.handoverId);
      
      // Handle array filters
      filters.statuses.forEach(status => params.append('status', status));
      filters.updatedBy.forEach(updatedBy => params.append('updatedBy', updatedBy));

      const response = await fetch(`/api/parcels?${params}`);
      const data = await response.json();

      if (data.success) {
        const allTrackingNumbers = data.data.parcels.map((parcel: Parcel) => parcel.tracking_number).join('\n');
        await navigator.clipboard.writeText(allTrackingNumbers);
        
        console.log(`Copied ${data.data.parcels.length} tracking numbers to clipboard`);
        // You could add a toast notification here showing the actual count
      } else {
        console.error('Failed to fetch all parcels for copying:', data.error);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      try {
        // If the modern API failed, try to get current page data as fallback
        const trackingNumbers = parcels.map(parcel => parcel.tracking_number).join('\n');
        const textArea = document.createElement('textarea');
        textArea.value = trackingNumbers;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log(`Copied ${parcels.length} tracking numbers (current page only) to clipboard`);
      } catch (fallbackError) {
        console.error('All clipboard methods failed:', fallbackError);
      }
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchParcels();
  }, []);

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

  const getDirectionBadge = (direction: string) => {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        direction === 'forward' 
          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
          : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      }`}>
        {direction.charAt(0).toUpperCase() + direction.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSortIcon = (column: string) => {
    if (filters.sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return filters.sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  const handleParcelClick = (trackingNumber: string) => {
    setSelectedParcelTrackingNumber(trackingNumber);
    setShowEventLogsModal(true);
  };

  const closeEventLogsModal = () => {
    setShowEventLogsModal(false);
    setSelectedParcelTrackingNumber('');
  };

  if (isLoading && parcels.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shopee Parcels</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track and manage all Shopee parcels across handovers
          </p>
          {pagination && (
            <div className="mt-1">
              <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 rounded">
                📦 Showing {pagination.totalCount} parcels
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-orange-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
          <button
            onClick={clearFilters}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Search Tracking Number
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Enter tracking number..."
              className="w-full px-3 py-2 border border-orange-300 dark:border-slate-600 rounded-md text-sm
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                       focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Handover Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Handover
            </label>
            <select
              value={filters.handoverId}
              onChange={(e) => handleFilterChange('handoverId', e.target.value)}
              className="w-full px-3 py-2 border border-orange-300 dark:border-slate-600 rounded-md text-sm
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                       focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">All Handovers</option>
              <option value="null">No Handover</option>
              {filterOptions.handovers.map(handover => (
                <option key={handover.id} value={handover.id}>
                  ID {handover.id} - {handover.file_name || 'No filename'} ({formatDate(handover.handover_date)})
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Status ({filters.statuses.length} selected)
            </label>
            <div
              className="w-full px-3 py-2 border border-orange-300 dark:border-slate-600 rounded-md text-sm
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-white cursor-pointer
                       focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">
                  {filters.statuses.length === 0 ? 'No status selected' :
                   filters.statuses.length === filterOptions.statuses.length ? 'All statuses' :
                   `${filters.statuses.length} status(es) selected`}
                </span>
                <svg className={`w-4 h-4 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {statusDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-orange-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {/* Header with action buttons */}
                <div className="sticky top-0 bg-white dark:bg-slate-700 border-b border-orange-200 dark:border-slate-600 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => clearCheckboxes('statuses')}
                      className="flex-1 text-xs font-medium text-center rounded-md px-2 py-1.5 
                               bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 
                               hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors
                               border border-red-200 dark:border-red-800"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => selectAllCheckboxes('statuses')}
                      className="flex-1 text-xs font-medium text-center rounded-md px-2 py-1.5 
                               bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 
                               hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors
                               border border-green-200 dark:border-green-800"
                    >
                      Select All
                    </button>
                  </div>
                </div>

                {/* Checkbox options */}
                <div className="p-2 space-y-1">
                  {filterOptions.statuses.map(status => (
                    <label key={status} className="flex items-center space-x-2 text-sm hover:bg-orange-50 dark:hover:bg-slate-600 p-2 rounded cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={filters.statuses.includes(status)}
                        onChange={(e) => handleCheckboxChange('statuses', status, e.target.checked)}
                        className="rounded border-orange-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-slate-700 dark:text-slate-300 flex-1">
                        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Direction */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Direction
            </label>
            <select
              value={filters.direction}
              onChange={(e) => handleFilterChange('direction', e.target.value)}
              className="w-full px-3 py-2 border border-orange-300 dark:border-slate-600 rounded-md text-sm
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                       focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">All Directions</option>
              {filterOptions.directions.map(direction => (
                <option key={direction} value={direction}>
                  {direction.charAt(0).toUpperCase() + direction.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Updated By Dropdown */}
          <div className="relative" ref={updatedByDropdownRef}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Updated By ({filters.updatedBy.length} selected)
            </label>
            <div
              className="w-full px-3 py-2 border border-orange-300 dark:border-slate-600 rounded-md text-sm
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-white cursor-pointer
                       focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              onClick={() => setUpdatedByDropdownOpen(!updatedByDropdownOpen)}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">
                  {filters.updatedBy.length === 0 ? 'No users selected' :
                   filters.updatedBy.length === filterOptions.updatedBy.length ? 'All users' :
                   `${filters.updatedBy.length} user(s) selected`}
                </span>
                <svg className={`w-4 h-4 transition-transform ${updatedByDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {updatedByDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-orange-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {/* Header with action buttons */}
                <div className="sticky top-0 bg-white dark:bg-slate-700 border-b border-orange-200 dark:border-slate-600 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => clearCheckboxes('updatedBy')}
                      className="flex-1 text-xs font-medium text-center rounded-md px-2 py-1.5 
                               bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 
                               hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors
                               border border-red-200 dark:border-red-800"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => selectAllCheckboxes('updatedBy')}
                      className="flex-1 text-xs font-medium text-center rounded-md px-2 py-1.5 
                               bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 
                               hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors
                               border border-green-200 dark:border-green-800"
                    >
                      Select All
                    </button>
                  </div>
                </div>

                {/* Checkbox options */}
                <div className="p-2 space-y-1">
                  {filterOptions.updatedBy.map(updatedBy => (
                    <label key={updatedBy} className="flex items-center space-x-2 text-sm hover:bg-orange-50 dark:hover:bg-slate-600 p-2 rounded cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={filters.updatedBy.includes(updatedBy)}
                        onChange={(e) => handleCheckboxChange('updatedBy', updatedBy, e.target.checked)}
                        className="rounded border-orange-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-slate-700 dark:text-slate-300 flex-1">
                        {updatedBy}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page Size Selector */}
        <div className="mt-4 flex items-center space-x-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Page Size:
          </label>
          <select
            value={filters.pageSize}
            onChange={(e) => handleFilterChange('pageSize', parseInt(e.target.value))}
            className="px-3 py-1 border border-orange-300 dark:border-slate-600 rounded-md text-sm
                     bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                     focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-orange-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-orange-200 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Shopee Parcel Records</h2>
            <div className="flex items-center space-x-4">
              {pagination && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {((pagination.currentPage - 1) * pagination.limit) + 1} - {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount}
                </span>
              )}
              <button
                onClick={copyTrackingNumbers}
                disabled={!pagination || pagination.totalCount === 0}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-md 
                         hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Copy all tracking numbers from current filtered results"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>
                  Copy Tracking Numbers ({pagination ? pagination.totalCount.toLocaleString() : '0'})
                </span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-orange-50 dark:bg-slate-700/50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => handleSort('tracking_number')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Tracking Number</span>
                    {getSortIcon('tracking_number')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => handleSort('direction')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Direction</span>
                    {getSortIcon('direction')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => handleSort('port_code')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Port Code</span>
                    {getSortIcon('port_code')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => handleSort('package_type')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Package Type</span>
                    {getSortIcon('package_type')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => handleSort('handover')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Handover</span>
                    {getSortIcon('handover')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => handleSort('updated_by')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Updated By</span>
                    {getSortIcon('updated_by')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => handleSort('updated_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Updated At</span>
                    {getSortIcon('updated_at')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {parcels.map((parcel) => (
                <tr 
                  key={parcel.tracking_number} 
                  className="hover:bg-orange-50 dark:hover:bg-slate-700/30"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleParcelClick(parcel.tracking_number)}
                      className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:underline cursor-pointer"
                    >
                      {parcel.tracking_number}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(parcel.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getDirectionBadge(parcel.direction)}
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
                    {parcel.handover ? (
                      <div className="text-sm text-slate-900 dark:text-white">
                        {formatDate(parcel.handover.handover_date)}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">No handover</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">
                      {parcel.updated_by}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(parcel.updated_at)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-orange-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 text-sm border border-orange-300 dark:border-slate-600 rounded-md
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-orange-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, pagination.currentPage - 2) + i;
                    if (pageNum > pagination.totalPages) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          pageNum === pagination.currentPage
                            ? 'bg-orange-600 text-white'
                            : 'border border-orange-300 dark:border-slate-600 hover:bg-orange-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 text-sm border border-orange-300 dark:border-slate-600 rounded-md
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-orange-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {parcels.length === 0 && !isLoading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No parcels found</h3>
          <p className="text-slate-600 dark:text-slate-400">
            Try adjusting your filters or check back later.
          </p>
        </div>
      )}

      {/* Event Logs Modal */}
      <ParcelEventLogsModal
        isOpen={showEventLogsModal}
        onClose={closeEventLogsModal}
        trackingNumber={selectedParcelTrackingNumber}
      />
    </div>
  );
}

// Loading component for Suspense fallback
function ParcelsLoading() {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function ParcelsPage() {
  return (
    <Suspense fallback={<ParcelsLoading />}>
      <ParcelsContent />
    </Suspense>
  );
}