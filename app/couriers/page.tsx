'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CourierTripsModal from '../components/CourierTripsModal';
import ShopeeTripsModal from '../components/ShopeeTripsModal';

interface Courier {
  id: number;
  name: string;
  isLazada: boolean;
  isShopee: boolean;
  lazRate: number | null;
  shopeeRate: number | null;
  type: string;
  created_at: string;
  updated_at: string;
}

export default function CouriersPage() {
  const router = useRouter();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTripsModal, setShowTripsModal] = useState(false);
  const [showShopeeTripsModal, setShowShopeeTripsModal] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    isLazada: false,
    isShopee: false,
    lazRate: '',
    shopeeRate: '',
    type: '2w'
  });

  // Load couriers from database
  useEffect(() => {
    const fetchCouriers = async () => {
      try {
        const response = await fetch('/api/couriers');
        const data = await response.json();
        
        if (data.success) {
          setCouriers(data.couriers);
        } else {
          console.error('Failed to fetch couriers:', data.error);
        }
      } catch (error) {
        console.error('Error fetching couriers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCouriers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        name: formData.name,
        isLazada: formData.isLazada,
        isShopee: formData.isShopee,
        lazRate: formData.lazRate ? parseFloat(formData.lazRate) : null,
        shopeeRate: formData.shopeeRate ? parseFloat(formData.shopeeRate) : null,
        type: formData.type
      };

      const url = editingCourier ? `/api/couriers/${editingCourier.id}` : '/api/couriers';
      const method = editingCourier ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        if (editingCourier) {
          setCouriers(prev => prev.map(c => c.id === editingCourier.id ? result.courier : c));
        } else {
          setCouriers(prev => [result.courier, ...prev]);
        }
        
        resetForm();
        setShowCreateModal(false);
        setEditingCourier(null);
      } else {
        alert(result.error || 'Failed to save courier');
      }
    } catch (error) {
      console.error('Error saving courier:', error);
      alert('Error saving courier');
    }
  };

  const handleEdit = (courier: Courier) => {
    setEditingCourier(courier);
    setFormData({
      name: courier.name,
      isLazada: courier.isLazada,
      isShopee: courier.isShopee,
      lazRate: courier.lazRate?.toString() || '',
      shopeeRate: courier.shopeeRate?.toString() || '',
      type: courier.type
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this courier?')) return;

    try {
      const response = await fetch(`/api/couriers/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setCouriers(prev => prev.filter(c => c.id !== id));
      } else {
        alert(result.error || 'Failed to delete courier');
      }
    } catch (error) {
      console.error('Error deleting courier:', error);
      alert('Error deleting courier');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      isLazada: false,
      isShopee: false,
      lazRate: '',
      shopeeRate: '',
      type: '2w'
    });
  };

  // Sort couriers by type: 4w first, then 3w, then 2w
  const sortedCouriers = [...couriers].sort((a, b) => {
    const typeOrder = { '4w': 0, '3w': 1, '2w': 2 };
    const aOrder = typeOrder[a.type as keyof typeof typeOrder] ?? 3;
    const bOrder = typeOrder[b.type as keyof typeof typeOrder] ?? 3;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // If same type, sort by name alphabetically
    return a.name.localeCompare(b.name);
  });

  const copyCourierNames = async () => {
    const courierNames = sortedCouriers.map(courier => courier.name).join('\n');
    
    try {
      await navigator.clipboard.writeText(courierNames);
      // You could add a toast notification here if you have one
      alert('Courier names copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy courier names:', error);
      alert('Failed to copy courier names to clipboard');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Couriers</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage courier services and their rates
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowShopeeTripsModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🛒 Shopee Trips
          </button>
          <button 
            onClick={() => setShowTripsModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            📊 Analyze Trips
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + New Courier
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
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{couriers.length}</p>
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
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Lazada</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {couriers.filter(c => c.isLazada).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Shopee</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {couriers.filter(c => c.isShopee).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Both</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {couriers.filter(c => c.isLazada && c.isShopee).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Courier Records</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Platforms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Lazada Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Shopee Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {sortedCouriers.map((courier) => (
                <tr 
                  key={courier.id} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {courier.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      {courier.isLazada && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                          Lazada
                        </span>
                      )}
                      {courier.isShopee && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          Shopee
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">
                      {courier.lazRate ? `$${courier.lazRate.toFixed(2)}` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">
                      {courier.shopeeRate ? `$${courier.shopeeRate.toFixed(2)}` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      courier.type === '2w' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : courier.type === '3w'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                    }`}>
                      {courier.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(courier.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(courier)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(courier.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Courier Trips Modal */}
      <CourierTripsModal 
        isOpen={showTripsModal}
        onClose={() => setShowTripsModal(false)}
      />

      {/* Shopee Trips Modal */}
      <ShopeeTripsModal
        isOpen={showShopeeTripsModal}
        onClose={() => setShowShopeeTripsModal(false)}
      />

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => {
            setShowCreateModal(false);
            setEditingCourier(null);
            resetForm();
          }} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md transform rounded-lg bg-white dark:bg-slate-800 shadow-xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  {editingCourier ? 'Edit Courier' : 'Create New Courier'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm
                               bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.isLazada}
                          onChange={(e) => setFormData(prev => ({ ...prev, isLazada: e.target.checked }))}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Lazada</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.isShopee}
                          onChange={(e) => setFormData(prev => ({ ...prev, isShopee: e.target.checked }))}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Shopee</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Lazada Rate
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.lazRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, lazRate: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm
                                 bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Shopee Rate
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.shopeeRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, shopeeRate: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm
                                 bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm
                               bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="2w">2W</option>
                      <option value="3w">3W</option>
                      <option value="4w">4W</option>
                    </select>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingCourier(null);
                        resetForm();
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {editingCourier ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}