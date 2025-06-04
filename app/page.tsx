'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalHandovers: number;
  totalParcels: number;
  pendingHandovers: number;
  completedHandovers: number;
  forwardParcels: number;
  reverseParcels: number;
  recentHandovers: Array<{
    id: number;
    handover_date: string;
    quantity: number;
    status: string;
    platform: string;
  }>;
  parcelsByStatus: Array<{
    status: string;
    count: number;
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalHandovers: 0,
    totalParcels: 0,
    pendingHandovers: 0,
    completedHandovers: 0,
    forwardParcels: 0,
    reverseParcels: 0,
    recentHandovers: [],
    parcelsByStatus: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch handovers data
      const handoversResponse = await fetch('/api/handovers');
      const handoversData = await handoversResponse.json();

      // Fetch parcels data
      const parcelsResponse = await fetch('/api/parcels?limit=1000');
      const parcelsData = await parcelsResponse.json();

      if (handoversData.success && parcelsData.success) {
        const handovers = handoversData.data.handovers;
        const parcels = parcelsData.data.parcels;

        // Calculate stats
        const pendingHandovers = handovers.filter((h: any) => h.status === 'pending').length;
        const completedHandovers = handovers.filter((h: any) => h.status === 'done').length;
        const forwardParcels = parcels.filter((p: any) => p.direction === 'forward').length;
        const reverseParcels = parcels.filter((p: any) => p.direction === 'reverse').length;

        // Group parcels by status
        const statusCounts = parcels.reduce((acc: any, parcel: any) => {
          acc[parcel.status] = (acc[parcel.status] || 0) + 1;
          return acc;
        }, {});

        const parcelsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count: count as number
        }));

        // Get recent handovers
        const recentHandovers = handovers
          .sort((a: any, b: any) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime())
          .slice(0, 5);

        setStats({
          totalHandovers: handovers.length,
          totalParcels: parcels.length,
          pendingHandovers,
          completedHandovers,
          forwardParcels,
          reverseParcels,
          recentHandovers,
          parcelsByStatus
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'text-yellow-600 dark:text-yellow-400',
      done: 'text-green-600 dark:text-green-400',
      in_linehaul: 'text-blue-600 dark:text-blue-400',
      delivered: 'text-green-600 dark:text-green-400',
      processing: 'text-purple-600 dark:text-purple-400',
      failed: 'text-red-600 dark:text-red-400'
    };
    return colors[status] || 'text-slate-600 dark:text-slate-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Parcel Tracking Dashboard 📦
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Monitor your handovers and parcel tracking operations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Handovers
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalHandovers}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {stats.pendingHandovers} pending
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Parcels
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalParcels}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {stats.forwardParcels} forward, {stats.reverseParcels} reverse
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Pending Handovers
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.pendingHandovers}
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Requires attention
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Completed Handovers
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.completedHandovers}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Successfully processed
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Parcel Status Overview */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Parcel Status Overview
                </h3>
                <Link
                  href="/parcels"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all parcels
                </Link>
              </div>
              <div className="space-y-4">
                {stats.parcelsByStatus.slice(0, 6).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.status === 'delivered' ? 'bg-green-500' :
                        item.status === 'in_linehaul' ? 'bg-blue-500' :
                        item.status === 'pending' ? 'bg-yellow-500' :
                        item.status === 'failed' ? 'bg-red-500' :
                        'bg-purple-500'
                      }`}></div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
              {stats.parcelsByStatus.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-8 h-8 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    No parcels found
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Handovers */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Recent Handovers
              </h3>
              <Link
                href="/handovers"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {stats.recentHandovers.map((handover) => (
                <Link
                  key={handover.id}
                  href={`/handovers/${handover.id}`}
                  className="block p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {handover.platform || 'Unknown Platform'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {handover.quantity} parcels
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {formatDate(handover.handover_date)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      handover.status === 'done' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {handover.status}
                    </span>
                  </div>
                </Link>
              ))}
              {stats.recentHandovers.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    No recent handovers
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/handovers"
              className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 text-left group"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">
                View Handovers
              </p>
            </Link>

            <Link
              href="/parcels"
              className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 text-left group"
            >
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">
                Track Parcels
              </p>
            </Link>

            <button
              onClick={() => window.location.reload()}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 text-left group"
            >
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg
                  className="w-5 h-5 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">
                Refresh Data
              </p>
            </button>

            <button
              className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 text-left group opacity-50 cursor-not-allowed"
              disabled
            >
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-3">
                <svg
                  className="w-5 h-5 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">
                Settings
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
