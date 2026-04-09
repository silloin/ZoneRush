import React, { useState, useEffect } from 'react';
import { X, Settings, Check } from 'lucide-react';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      // Load saved preferences
      try {
        const savedPrefs = JSON.parse(consent);
        setPreferences(savedPrefs);
      } catch (e) {
        console.error('Error parsing cookie consent:', e);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    saveConsent(allAccepted);
  };

  const handleAcceptSelected = () => {
    saveConsent(preferences);
  };

  const handleRejectAll = () => {
    const minimal = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    saveConsent(minimal);
  };

  const saveConsent = (prefs) => {
    localStorage.setItem('cookie-consent', JSON.stringify(prefs));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
    setShowPreferences(false);
    
    // Initialize tracking based on consent
    initializeTracking(prefs);
  };

  const initializeTracking = (prefs) => {
    // Only initialize analytics if consented
    if (prefs.analytics) {
      console.log('Analytics tracking enabled');
      // Initialize your analytics here (Google Analytics, etc.)
      // Example: window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    
    if (prefs.marketing) {
      console.log('Marketing cookies enabled');
      // Initialize marketing tracking
    }
  };

  const togglePreference = (key) => {
    if (key === 'necessary') return; // Cannot disable necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Main Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {!showPreferences ? (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  🍪 We value your privacy
                </h3>
                <p className="text-sm text-gray-300 mb-2">
                  We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                  By clicking "Accept All", you consent to our use of cookies.
                </p>
                <p className="text-xs text-gray-400">
                  Read our{' '}
                  <a href="/privacy-policy" className="text-blue-400 hover:text-blue-300 underline">
                    Privacy Policy
                  </a>{' '}
                  for more information.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowPreferences(true)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Settings size={16} className="mr-2" />
                  Preferences
                </button>
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Reject All
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            /* Preferences Panel */
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Cookie Preferences</h3>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Necessary Cookies */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">Necessary Cookies</h4>
                      <p className="text-sm text-gray-400">
                        Required for the website to function properly. Cannot be disabled.
                      </p>
                    </div>
                    <div className="flex items-center text-green-400">
                      <Check size={20} />
                      <span className="ml-2 text-sm">Always Active</span>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">Analytics Cookies</h4>
                      <p className="text-sm text-gray-400">
                        Help us understand how visitors interact with our website by collecting anonymous information.
                      </p>
                    </div>
                    <button
                      onClick={() => togglePreference('analytics')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.analytics ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.analytics ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">Marketing Cookies</h4>
                      <p className="text-sm text-gray-400">
                        Used to deliver personalized advertisements and track their performance.
                      </p>
                    </div>
                    <button
                      onClick={() => togglePreference('marketing')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.marketing ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.marketing ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Preference Cookies */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">Preference Cookies</h4>
                      <p className="text-sm text-gray-400">
                        Enable enhanced functionality and personalization, such as remembering your settings.
                      </p>
                    </div>
                    <button
                      onClick={() => togglePreference('preferences')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.preferences ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.preferences ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptSelected}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind banner */}
      {showBanner && <div className="h-32"></div>}
    </>
  );
};

export default CookieConsent;
