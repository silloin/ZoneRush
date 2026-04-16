import React, { useState, useEffect, useContext } from 'react';
import { X, Bell, Mail, Smartphone, MapPin, Users, Trophy, Clock, Check, Save, AlertCircle } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';

const NotificationSettings = ({ isOpen, onClose }) => {
  const { user } = useContext(AuthContext);
  const [preferences, setPreferences] = useState({
    tile_capture_alerts: true,
    training_reminders: true,
    friend_activity: true,
    email_notifications: true,
    push_notifications: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch preferences on mount
  useEffect(() => {
    if (isOpen && user) {
      fetchPreferences();
    }
  }, [isOpen, user]);

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.getPreferences();
      setPreferences(data);
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await notificationService.updatePreferences(preferences);
      setSuccessMessage('Preferences saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const notificationOptions = [
    {
      key: 'tile_capture_alerts',
      label: 'Tile Capture Alerts',
      description: 'Get notified when someone captures your tile',
      icon: MapPin,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
    {
      key: 'training_reminders',
      label: 'Training Reminders',
      description: 'Receive reminders for your scheduled training plans',
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      key: 'friend_activity',
      label: 'Friend Activity',
      description: 'Notifications about friend requests and friend activities',
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      key: 'achievement_notifications',
      label: 'Achievements & Milestones',
      description: 'Get notified when you unlock achievements or reach milestones',
      icon: Trophy,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    }
  ];

  const deliveryOptions = [
    {
      key: 'email_notifications',
      label: 'Email Notifications',
      description: 'Receive notifications via email when you are offline',
      icon: Mail,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      key: 'push_notifications',
      label: 'Push Notifications',
      description: 'Receive push notifications on your device',
      icon: Smartphone,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    }
  ];

  const ToggleSwitch = ({ checked, onChange, disabled }) => (
    <button
      onClick={() => !disabled && onChange()}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-blue-600' : 'bg-gray-600'}`}
      disabled={disabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const OptionCard = ({ option, checked, onToggle, disabled }) => {
    const Icon = option.icon;
    return (
      <div className={`flex items-center justify-between p-4 rounded-lg border ${
        checked ? 'border-blue-500/30 bg-blue-500/5' : 'border-gray-700 bg-gray-800/50'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${option.bgColor}`}>
            <Icon size={20} className={option.color} />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{option.label}</h4>
            <p className="text-xs text-gray-400 mt-1">{option.description}</p>
          </div>
        </div>
        <ToggleSwitch checked={checked} onChange={onToggle} disabled={disabled} />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-900 rounded-xl shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Bell size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Notification Settings</h2>
              <p className="text-xs text-gray-400">Manage your notification preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={16} className="text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Check size={16} className="text-green-400" />
              <p className="text-sm text-green-400">{successMessage}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              {/* Notification Types */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Bell size={16} />
                  Notification Types
                </h3>
                <div className="space-y-2">
                  {notificationOptions.map(option => (
                    <OptionCard
                      key={option.key}
                      option={option}
                      checked={preferences[option.key]}
                      onToggle={() => handleToggle(option.key)}
                      disabled={saving}
                    />
                  ))}
                </div>
              </div>

              {/* Delivery Methods */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Smartphone size={16} />
                  Delivery Methods
                </h3>
                <div className="space-y-2">
                  {deliveryOptions.map(option => (
                    <OptionCard
                      key={option.key}
                      option={option}
                      checked={preferences[option.key]}
                      onToggle={() => handleToggle(option.key)}
                      disabled={saving}
                    />
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-gray-400">
                  <span className="text-blue-400 font-medium">Tip:</span> You can also create scheduled notifications from your training plans or set custom reminders.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
