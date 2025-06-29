'use client'

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { useState } from "react";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { NotificationProvider } from "./components/NotificationProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <html lang="en">
      <head>
        <title>Dashboard App</title>
        <meta name="description" content="Modern dashboard application" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 dark:bg-slate-900`}
      >
        <NotificationProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar 
              isOpen={sidebarOpen} 
              onToggle={() => setSidebarOpen(!sidebarOpen)}
            />
            
            {/* Mobile overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Main content area */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
              sidebarOpen ? 'lg:ml-64' : 'ml-0'
            }`}>
              {/* Top header with mobile menu button */}
              <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
                <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center space-x-4">
                    {/* Mobile menu button */}
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
                    >
                      <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    
                    {/* Desktop toggle button */}
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="hidden lg:block p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Header right side */}
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                  </div>
                </div>
              </header>

              {/* Page content */}
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </NotificationProvider>
      </body>
    </html>
  );
}
