'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../../components/NotificationProvider';
import CreateNewHandover from '@/components/shopee/handover/CreateNewHandover';
import AddToHandover from '@/components/shopee/handover/AddToHandover';

// Types
interface Handover {
  id: string;
  date: string;
  fileName: string;
  status: 'pending' | 'done';
  parcelCount: number;
  createdAt: string;
  platform: string;
}

interface HandoverStats {
  total: number;
  pending: number;
  completed: number;
  totalParcels: number;
}

export default function ShopeeHandoversPage() {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HandoverStats>({
    total: 0,
    pending: 0,
    completed: 0,
    totalParcels: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'parcels'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<{ id: string; name: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [handoverToDelete, setHandoverToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { addNotification } = useNotifications();
  const router = useRouter();

  // Fetch handovers from API
  const fetchHandovers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shopee/handovers');
      const data = await response.json();
      
      if (data.success && data.handovers) {
        const transformedHandovers: Handover[] = data.handovers.map((h: any) => ({
          id: h.id.toString(),
          date: h.handover_date.split('T')[0],
          fileName: h.file_name,
          status: h.status,
          parcelCount: h.parcels?.length || 0,
          createdAt: h.date_added.split('T')[0],
          platform: 'shopee'
        }));
        
        setHandovers(transformedHandovers);
        
        // Calculate stats
        const stats: HandoverStats = {
          total: transformedHandovers.length,
          pending: transformedHandovers.filter(h => h.status === 'pending').length,
          completed: transformedHandovers.filter(h => h.status === 'done').length,
          totalParcels: transformedHandovers.reduce((sum, h) => sum + h.parcelCount, 0)
        };
        setStats(stats);
      } else {
        setHandovers([]);
        setStats({ total: 0, pending: 0, completed: 0, totalParcels: 0 });
      }
    } catch (error) {
      console.error('Error fetching handovers:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load handovers'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandovers();
  }, []);

  // Filter and sort handovers
  const filteredAndSortedHandovers = handovers
    .filter(handover => {
      const matchesSearch = handover.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || handover.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.fileName.toLowerCase();
          bValue = b.fileName.toLowerCase();
          break;
        case 'parcels':
          aValue = a.parcelCount;
          bValue = b.parcelCount;
          break;
        default: // date
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const handleViewHandover = (handoverId: string) => {
    router.push(`/shopee/handovers/${handoverId}`);
  };

  const handleCreateNew = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleAddToHandover = (handoverId: string, handoverName: string) => {
    setSelectedHandover({ id: handoverId, name: handoverName });
    setIsAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
    setSelectedHandover(null);
  };

  const handleHandoverSave = async (handoverData: { 
    trackingNumbers: string[];
    date: string;
    type: string;
  }) => {
    if (!handoverData.trackingNumbers || handoverData.trackingNumbers.length === 0 || !handoverData.date) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please provide both tracking numbers and date'
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const requestData = {
        handoverData: {
          date: handoverData.date,
          fileName: `Shopee_Handover_${handoverData.date}.txt`,
          type: 'shopee'
        },
        trackingNumbers: handoverData.trackingNumbers
      };

      const response = await fetch('/api/shopee/handovers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: result.message || 'Handover created successfully'
        });
        
        // Refresh the handovers list
        await fetchHandovers();
        
        // Close the modal
        setIsModalOpen(false);
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: result.error || 'Failed to create handover'
        });
      }
    } catch (error) {
      console.error('Error creating handover:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create handover. Please try again.'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddToHandoverSave = async (data: { 
    handoverId: string;
    trackingNumbers: string[];
  }) => {
    if (!data.trackingNumbers || data.trackingNumbers.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please provide at least one tracking number'
      });
      return;
    }

    setIsAdding(true);
    
    try {
      const response = await fetch(`/api/shopee/handovers/${data.handoverId}/add-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackingNumbers: data.trackingNumbers }),
      });

      const result = await response.json();

      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: result.message || 'Tracking numbers added successfully'
        });
        
        // Refresh the handovers list
        await fetchHandovers();
        
        // Close the modal
        setIsAddModalOpen(false);
        setSelectedHandover(null);
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: result.error || 'Failed to add tracking numbers'
        });
      }
    } catch (error) {
      console.error('Error adding tracking numbers:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to add tracking numbers. Please try again.'
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteHandover = (handoverId: string, handoverName: string) => {
    setHandoverToDelete({ id: handoverId, name: handoverName });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!handoverToDelete) return;

    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/shopee/handovers/${handoverToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Handover deleted successfully'
        });
        
        // Refresh the handovers list
        await fetchHandovers();
        
        // Close the modal
        setDeleteModalOpen(false);
        setHandoverToDelete(null);
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: result.error || 'Failed to delete handover'
        });
      }
    } catch (error) {
      console.error('Error deleting handover:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete handover. Please try again.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setHandoverToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
      done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status === 'done' ? 'Completed' : 'Pending'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Shopee Handovers
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Manage and track your Shopee handover documents
              </p>
            </div>
            <div className="mt-4 lg:mt-0">
              <button
                onClick={handleCreateNew}
                disabled={isCreating}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <>
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Handover
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                      Total Handovers
                    </dt>
                    <dd className="text-lg font-medium text-slate-900 dark:text-white">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                      Pending
                    </dt>
                    <dd className="text-lg font-medium text-slate-900 dark:text-white">
                      {stats.pending}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                      Completed
                    </dt>
                    <dd className="text-lg font-medium text-slate-900 dark:text-white">
                      {stats.completed}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                      Total Parcels
                    </dt>
                    <dd className="text-lg font-medium text-slate-900 dark:text-white">
                      {stats.totalParcels}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search handovers..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'done')}
                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="done">Completed</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'parcels')}
                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="parcels">Parcel Count</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Order
              </label>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full inline-flex items-center justify-center px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {sortOrder === 'asc' ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    Ascending
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                    Descending
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Handovers List */}
        {filteredAndSortedHandovers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 shadow rounded-lg">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No handovers found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'Get started by creating your first handover.'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <div className="mt-6">
                  <button
                    onClick={handleCreateNew}
                    disabled={isCreating}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create New Handover
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 shadow overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Handover
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Parcels
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredAndSortedHandovers.map((handover) => (
                    <tr key={handover.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {handover.fileName}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              ID: {handover.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {formatDate(handover.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(handover.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {handover.parcelCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(handover.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleAddToHandover(handover.id, handover.fileName)}
                            disabled={isAdding}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Add tracking numbers to this handover"
                          >
                            {isAdding && selectedHandover?.id === handover.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add
                              </>
                            )}
                          </button>
                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <button
                            onClick={() => handleDeleteHandover(handover.id, handover.fileName)}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete this handover"
                          >
                            {isDeleting && handoverToDelete?.id === handover.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </>
                            )}
                          </button>
                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <button
                            onClick={() => handleViewHandover(handover.id)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create New Handover Modal */}
      <CreateNewHandover
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleHandoverSave}
      />

      {/* Add to Handover Modal */}
      {selectedHandover && (
        <AddToHandover
          isOpen={isAddModalOpen}
          onClose={handleAddModalClose}
          onSave={handleAddToHandoverSave}
          handoverId={selectedHandover.id}
          handoverName={selectedHandover.name}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && handoverToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out"
            onClick={handleDeleteCancel} 
          />
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md transform rounded-lg bg-white dark:bg-slate-800 shadow-xl transition-all duration-300 ease-out">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Delete Handover
                </h3>
                <button
                  onClick={handleDeleteCancel}
                  className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-slate-900 dark:text-white">
                      Are you sure?
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      This action will permanently delete the handover "{handoverToDelete.name}" and all its associated tracking data. This cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-spin inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Handover'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
                           