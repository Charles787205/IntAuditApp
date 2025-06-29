'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AnalyzeTripsModal from './components/AnalyzeTripsModal';
import AnalyzeWeeklySummaryModal from './components/AnalyzeWeeklySummaryModal';

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
  const [showAnalyzeTripsModal, setShowAnalyzeTripsModal] = useState(false);
  const [showAnalyzeWeeklySummaryModal, setShowAnalyzeWeeklySummaryModal] = useState(false);

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
        const handovers = handoversData.handovers; // Remove .data wrapper
        const parcels = parcelsData.data.parcels; // Keep .data wrapper for parcels

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
                  href="/shopee/parcels"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Shopee parcels
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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
              href="/shopee/parcels"
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
                Track Shopee Parcels
              </p>
            </Link>

            <button
              onClick={() => setShowAnalyzeTripsModal(true)}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 text-left group"
            >
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg
                  className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">
                Analyze Trips
              </p>
            </button>

            <button
              onClick={() => setShowAnalyzeWeeklySummaryModal(true)}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 text-left group"
            >
              <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg
                  className="w-5 h-5 text-violet-600 dark:text-violet-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                  />
                </svg>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">
                Weekly Summary
              </p>
            </button>

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

            <Link
              href="/couriers"
              className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 text-left group"
            >
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">
                Manage Couriers
              </p>
            </Link>
          </div>
        </div>

        {/* Analysis Modals */}
        <AnalyzeTripsModal 
          isOpen={showAnalyzeTripsModal}
          onClose={() => setShowAnalyzeTripsModal(false)}
        />

        <AnalyzeWeeklySummaryModal 
          isOpen={showAnalyzeWeeklySummaryModal}
          onClose={() => setShowAnalyzeWeeklySummaryModal(false)}
        />
      </div>
    </div>
  );
}
