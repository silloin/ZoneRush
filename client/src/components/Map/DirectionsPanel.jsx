import React, { useState } from 'react';

/**
 * DirectionsPanel - Toggleable navigation directions panel
 * Optimized for mobile with collapse/expand functionality
 */
const DirectionsPanel = ({ directionsData, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!directionsData) return null;

  return (
    <>
      {/* Floating Toggle Button - Bottom Right */}
      <button
        onClick={() => setIsMinimized(prev => !prev)}
        className="fixed bottom-24 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-2xl transition-all duration-300 md:bottom-8"
        title={isMinimized ? 'Show directions' : 'Hide directions'}
        aria-label={isMinimized ? 'Show directions panel' : 'Hide directions panel'}
      >
        {isMinimized ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Directions Panel - Mobile Optimized */}
      <div
        className={`absolute left-0 right-0 bg-white shadow-2xl z-40 transition-transform duration-300 ease-in-out md:max-w-md md:left-4 md:right-auto ${
          isMinimized
            ? 'translate-y-[calc(100%-48px)]'
            : 'translate-y-0'
        } bottom-0 ${
          isMinimized ? 'h-auto' : 'max-h-[50vh] md:max-h-96'
        } overflow-hidden`}
      >
        {/* Swipe Handle / Header - Always Visible */}
        <div
          onClick={() => setIsMinimized(prev => !prev)}
          className="w-full bg-gray-100 border-b border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-200 transition-colors touch-manipulation"
          title="Tap to toggle directions panel"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsMinimized(prev => !prev);
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {/* Mobile swipe handle */}
              <div className="w-12 h-1 bg-gray-400 rounded-full md:hidden"></div>
              <h3 className="font-bold text-sm md:text-lg text-gray-800">Directions</h3>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex space-x-3 text-xs md:text-sm">
                <span className="text-gray-600">📏 {directionsData.distance} km</span>
                <span className="text-gray-600">⏱️ {directionsData.duration} min</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  setIsMinimized(false);
                }}
                className="text-gray-500 hover:text-red-600 transition-colors p-1"
                title="Close directions"
                aria-label="Close directions panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Direction Steps - Hidden when minimized */}
        {!isMinimized && (
          <div className="max-h-64 overflow-y-auto overscroll-contain bg-white">
            {directionsData.steps.map((step, index) => (
              <div key={index} className="p-3 border-b border-gray-100 hover:bg-blue-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{step.instruction}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {step.distance} km • {step.duration} min
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default DirectionsPanel;
