'use client';

import { useState, useEffect } from 'react';

interface AddToHandoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { 
    handoverId: string;
    trackingNumbers: string[];
  }) => void;
  handoverId: string;
  handoverName: string;
}

export default function AddToHandover({ isOpen, onClose, onSave, handoverId, handoverName }: AddToHandoverProps) {
  const [trackingNumbersText, setTrackingNumbersText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to ensure the element is rendered before animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  const parseTrackingNumbers = (text: string): string[] => {
    return text
      .split(/[\n,;]/) // Split by newlines, commas, or semicolons
      .map(num => num.trim().toUpperCase()) // Trim whitespace and convert to uppercase
      .filter(num => num.length > 0); // Remove empty strings
  };

  const handleSave = () => {
    const trackingNumbers = parseTrackingNumbers(trackingNumbersText);
    if (trackingNumbers.length === 0) {
      alert('Please enter at least one tracking number');
      return;
    }

    onSave({ 
      handoverId,
      trackingNumbers
    });
    handleClose();
  };

  const handleClose = () => {
    setTrackingNumbersText('');
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with fade animation */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose} 
      />
      
      {/* Modal with scale and fade animation */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative w-full max-w-md transform rounded-lg bg-white dark:bg-slate-800 shadow-xl transition-all duration-300 ease-out ${
            isAnimating 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add to Handover
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {handoverName}
              </p>
            </div>
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
            {/* Tracking Numbers Textarea */}
            <div>
              <label htmlFor="trackingNumbers" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Additional Tracking Numbers
              </label>
              <textarea
                id="trackingNumbers"
                value={trackingNumbersText}
                onChange={(e) => setTrackingNumbersText(e.target.value)}
                placeholder="Paste tracking numbers here (one per line or separated by commas)&#10;&#10;Example:&#10;SPXMY123456789&#10;SPXMY987654321&#10;SPXMY456789123"
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-all duration-200 resize-none font-mono text-sm"
              />
              {trackingNumbersText && (
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {parseTrackingNumbers(trackingNumbersText).length} tracking numbers detected
                </div>
              )}
            </div>
            
            {/* Info message */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    These tracking numbers will be added to the existing handover. Duplicate tracking numbers will be automatically skipped.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with button animations */}
          <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg"
            >
              Add to Handover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
