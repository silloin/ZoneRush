import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Users, MapPin, Clock, CheckCircle, XCircle, Activity, Phone } from 'lucide-react';

const SOSAdminDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/emergency/alerts/history?limit=50', {
        headers: { 'x-auth-token': token }
      });
      setAlerts(res.data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/emergency/stats', {
        headers: { 'x-auth-token': token }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const openInMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Activity size={48} className="animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-xl">Loading SOS Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={48} />
            SOS Emergency Dashboard
          </h1>
          <p className="text-gray-400">Monitor and manage all emergency alerts</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-xl p-6 border border-red-500/30">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="text-red-500" size={24} />
                <span className="text-3xl font-bold">{stats.totalAlerts || 0}</span>
              </div>
              <p className="text-gray-400">Total Alerts</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="text-green-500" size={24} />
                <span className="text-3xl font-bold">{stats.activeUsers || 0}</span>
              </div>
              <p className="text-gray-400">Active Users</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <Users className="text-blue-500" size={24} />
                <span className="text-3xl font-bold">{stats.totalContacts || 0}</span>
              </div>
              <p className="text-gray-400">Emergency Contacts</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-yellow-500/30">
              <div className="flex items-center justify-between mb-2">
                <Clock className="text-yellow-500" size={24} />
                <span className="text-3xl font-bold">{stats.last24Hours || 0}</span>
              </div>
              <p className="text-gray-400">Last 24 Hours</p>
            </div>
          </div>
        )}

        {/* Recent Alerts Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Activity size={24} className="text-blue-500" />
              Recent SOS Alerts
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Contacts Notified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No SOS alerts yet</p>
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-750 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatTime(alert.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xs font-bold">
                              {alert.username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="font-semibold">
                            {alert.username || `User ${alert.user_id}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openInMaps(alert.latitude, alert.longitude)}
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <MapPin size={16} />
                          <span className="text-xs">
                            {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                          </span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                        {alert.message || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {alert.contacts_notified ? (
                          <div className="flex -space-x-2">
                            {JSON.parse(alert.contacts_notified).slice(0, 5).map((contact, idx) => (
                              <div
                                key={idx}
                                className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-xs border-2 border-gray-800"
                                title={contact}
                              >
                                {contact.charAt(0)}
                              </div>
                            ))}
                            {JSON.parse(alert.contacts_notified).length > 5 && (
                              <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs border-2 border-gray-800">
                                +{JSON.parse(alert.contacts_notified).length - 5}
                              </div>
                            )}
                          </div>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedAlert(alert)}
                            className="text-blue-400 hover:text-blue-300"
                            title="View Details"
                          >
                            View
                          </button>
                          <a
                            href={`tel:911`}
                            className="text-green-400 hover:text-green-300 flex items-center gap-1"
                            title="Call Emergency Services"
                          >
                            <Phone size={16} />
                            Call
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alert Details Modal */}
        {selectedAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <AlertTriangle className="text-red-500" size={28} />
                  SOS Alert Details
                </h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">User</p>
                    <p className="font-semibold">
                      {selectedAlert.username || `User ${selectedAlert.user_id}`}
                    </p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Time</p>
                    <p className="font-semibold">{formatTime(selectedAlert.created_at)}</p>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">GPS Coordinates</p>
                  <p className="font-mono text-sm">
                    Latitude: {selectedAlert.latitude}<br/>
                    Longitude: {selectedAlert.longitude}
                  </p>
                  <button
                    onClick={() => openInMaps(selectedAlert.latitude, selectedAlert.longitude)}
                    className="mt-2 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                  >
                    <MapPin size={16} />
                    Open in Google Maps
                  </button>
                </div>

                {selectedAlert.message && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Message</p>
                    <p className="text-sm">{selectedAlert.message}</p>
                  </div>
                )}

                {selectedAlert.contacts_notified && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-2">Contacts Notified</p>
                    <div className="space-y-2">
                      {JSON.parse(selectedAlert.contacts_notified).map((contact, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-500" />
                          <span>{contact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <a
                    href={`https://www.google.com/maps?q=${selectedAlert.latitude},${selectedAlert.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-lg font-semibold transition"
                  >
                    Navigate to Location
                  </a>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSAdminDashboard;
