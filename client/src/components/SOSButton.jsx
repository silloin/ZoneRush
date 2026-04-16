import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { AlertTriangle, MapPin, Phone, X, Send, Radio } from 'lucide-react';
import io from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { getSocketURL, getSocketOptions } from '../services/socketConfig';

const SOSButton = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [sending, setSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [alertSent, setAlertSent] = useState(false);
  const [whatsappLinks, setWhatsappLinks] = useState([]);
  const [sosId, setSosId] = useState(null);
  const [liveTrackingActive, setLiveTrackingActive] = useState(false);
  const [showContactsForm, setShowContactsForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', type: 'friend' });

  const getLocationAndSend = () => {
    setShowSOSModal(true);
    setAlertSent(false);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const sendSOSAlert = async () => {
    if (!gpsLocation) {
      alert('Waiting for location...');
      return;
    }

    setSending(true);
    try {
      const res = await axios.post(
        '/emergency/send-sos',
        {
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          message: customMessage || null
        }
      );

      const alertId = res.data.alertId || Date.now();
      setSosId(alertId);
      setAlertSent(true);
      
      if (res.data.whatsappLinks) {
        setWhatsappLinks(res.data.whatsappLinks);
        
        // Auto-open WhatsApp links for all contacts
        setTimeout(() => {
          res.data.whatsappLinks.forEach((link, index) => {
            // Stagger opening to avoid browser blocking
            setTimeout(() => {
              window.open(link.whatsappUrl, '_blank');
            }, index * 500); // Open each link 500ms apart
          });
        }, 1000); // Wait 1 second after SOS is sent
      }
      
      // Start live tracking via Socket.IO
      startLiveTracking(gpsLocation.latitude, gpsLocation.longitude, alertId);
    } catch (err) {
      console.error('SOS Alert failed:', err);
      
      const errorMsg = err.response?.data?.msg || 'Failed to send SOS alert';
      
      // Check if it's the "no contacts" error
      if (errorMsg.includes('No emergency contacts')) {
        setShowContactsForm(true);
        setErrorMsg('⚠️ No emergency contacts configured!\n\nPlease add at least one emergency contact below before sending SOS.');
      } else if (err.response?.status === 500) {
        alert('❌ Server Error: ' + (err.response?.data?.error || errorMsg));
      } else {
        alert(errorMsg);
      }
    } finally {
      setSending(false);
    }
  };

  const startLiveTracking = (lat, lng, sosId) => {
    const socketUrl = getSocketURL();
    const socket = io(socketUrl, getSocketOptions());
    
    socket.on('connect', () => {
      socket.emit('authenticate', { userId: user.id });
      socket.emit('start-sos-tracking', { sosId, latitude: lat, longitude: lng });
      setLiveTrackingActive(true);
    });

    // Continue watching location with fallback
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        setGpsLocation({ latitude: newLat, longitude: newLng });
        
        // Send update to socket
        socket.emit('sos-location-update', {
          latitude: newLat,
          longitude: newLng,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading
        });
      },
      (error) => {
        // Handle different geolocation errors gracefully
        if (error.code === 3) {
          // Timeout - not critical, will retry automatically
          console.warn('Location watch timeout (will retry)');
        } else if (error.code === 1) {
          // Permission denied
          console.error('Location permission denied');
        } else if (error.code === 2) {
          // Position unavailable
          console.error('Location position unavailable');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    // Store watchId for cleanup
    socket.liveTrackingWatchId = watchId;
    socket.sosId = sosId;
    
    // Store socket reference for stopping later
    window.activeSOSSocket = socket;
  };

  const stopLiveTracking = () => {
    if (window.activeSOSSocket) {
      const socket = window.activeSOSSocket;
      
      // Clear geolocation watcher
      if (socket.liveTrackingWatchId !== undefined) {
        navigator.geolocation.clearWatch(socket.liveTrackingWatchId);
      }
      
      // Stop tracking on server
      socket.emit('stop-sos-tracking');
      socket.disconnect();
      
      delete window.activeSOSSocket;
      setLiveTrackingActive(false);
      
      alert('✅ Live tracking stopped. You are safe now.');
    }
  };

  const openWhatsApp = (url) => {
    window.open(url, '_blank');
  };

  const addEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone || !newContact.email) {
      alert('Please fill in name, phone number, and email');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/emergency/contacts',
        {
          contactName: newContact.name,
          phoneNumber: newContact.phone,
          email: newContact.email,
          contactType: newContact.type,
          priority: 1
        },
        {
          headers: { 'x-auth-token': token }
        }
      );

      alert('✅ Emergency contact added! You can now send SOS alerts.');
      setShowContactsForm(false);
      setNewContact({ name: '', phone: '', email: '', type: 'friend' });
      setErrorMsg('');
    } catch (err) {
      console.error('Error adding contact:', err);
      alert(err.response?.data?.msg || 'Failed to add contact');
    }
  };

  return (
    <>
      {/* SOS Button */}
      <button
        onClick={getLocationAndSend}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 md:bottom-6 md:right-6 bg-red-600 hover:bg-red-700 text-white p-3 sm:p-4 rounded-full shadow-2xl z-50 animate-pulse transition transform hover:scale-110 flex items-center justify-center"
        title="Emergency SOS"
      >
        <AlertTriangle size={24} className="sm:w-8 sm:h-8" />
        <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-extrabold px-2 py-1 rounded-full border-2 border-red-600 shadow-sm">
          SOS
        </span>
      </button>

      {/* SOS Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 max-w-md w-full relative shadow-2xl overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 animate-pulse"></div>

            {/* Close Button */}
            <button
              onClick={() => setShowSOSModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white p-2 hover:bg-gray-800 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-600/20 border-2 border-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg shadow-red-600/20">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                {alertSent ? '🚨 SOS ALERT SENT' : 'EMERGENCY SOS'}
              </h2>
              <p className="text-gray-400 text-sm font-medium">
                {alertSent 
                  ? liveTrackingActive
                    ? 'Live tracking ACTIVE — your location is updating'
                    : 'Location shared with contacts'
                  : 'Instantly notify your emergency contacts'}
              </p>
              
              {liveTrackingActive && (
                <div className="mt-4 bg-green-500/10 border border-green-500/50 rounded-2xl p-3">
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <Radio size={16} className="animate-pulse" />
                    <span className="font-bold text-xs uppercase tracking-widest">Live Tracking Active</span>
                  </div>
                  <button
                    onClick={stopLiveTracking}
                    className="mt-2 text-[10px] text-gray-500 hover:text-white underline font-bold uppercase tracking-tighter transition"
                  >
                    Stop Sharing
                  </button>
                </div>
              )}
            </div>

            {/* Emergency Contacts Form */}
            {showContactsForm && (
              <div className="mb-6 bg-blue-600/10 border border-blue-500/30 rounded-2xl p-5 animate-in fade-in zoom-in-95 duration-300">
                <h3 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                  <Phone size={16} />
                  Add Contact
                </h3>
                
                {errorMsg && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                    <p className="text-yellow-500 text-xs font-medium leading-relaxed">{errorMsg}</p>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="group">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 group-focus-within:text-blue-500 transition">{t('sos.name')}</label>
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                      placeholder={t('sos.placeholder_name')}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition shadow-inner"
                    />
                  </div>
                  
                  <div className="group">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 group-focus-within:text-blue-500 transition">{t('sos.phone')}</label>
                    <input
                      type="tel"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                      placeholder={t('sos.placeholder_phone')}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition shadow-inner"
                    />
                  </div>
                  
                  <div className="group">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 group-focus-within:text-blue-500 transition">{t('sos.email')}</label>
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                      placeholder={t('sos.placeholder_email')}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition shadow-inner"
                    />
                  </div>
                  
                  <div className="group">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 group-focus-within:text-blue-500 transition">{t('sos.relationship')}</label>
                    <select
                      value={newContact.type}
                      onChange={(e) => setNewContact({...newContact, type: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer shadow-inner"
                    >
                      <option value="family">Family</option>
                      <option value="friend">Friend</option>
                      <option value="colleague">Colleague</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={addEmergencyContact}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                      {t('sos.save')}
                    </button>
                    <button
                      onClick={() => {
                        setShowContactsForm(false);
                        setErrorMsg('');
                      }}
                      className="px-6 bg-gray-800 hover:bg-gray-700 text-gray-400 py-3 rounded-xl font-bold transition active:scale-95"
                    >
                      {t('sos.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!alertSent ? (
              <>
                {/* Location Status */}
                {gpsLocation ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 text-green-400 mb-1">
                      <MapPin size={18} />
                      <span className="font-bold text-sm">Location Locked</span>
                    </div>
                    <p className="text-[10px] text-gray-500 text-center font-mono tracking-tighter">
                      {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 text-yellow-500">
                      <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-bold text-sm">Acquiring GPS Signal...</span>
                    </div>
                  </div>
                )}

                {/* Custom Message */}
                <div className="mb-6">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">
                    {t('sos.message')}
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder={t('sos.placeholder_message')}
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none transition resize-none shadow-inner"
                    rows="2"
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={sendSOSAlert}
                  disabled={!gpsLocation || sending}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-600/20 active:scale-95 text-lg"
                >
                  {sending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>SENDING...</span>
                    </div>
                  ) : (
                    <>
                      <Send size={24} />
                      ACTIVATE SOS
                    </>
                  )}
                </button>

                <p className="text-[10px] text-gray-600 mt-6 text-center font-medium leading-relaxed px-4 uppercase tracking-tighter">
                  Authorized contacts will receive your live location and status via SMS/Email
                </p>
              </>
            ) : (
              <>
                {/* Success Message */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-6 text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/20">
                    <Send size={24} className="text-white" />
                  </div>
                  <span className="font-black text-green-400 text-lg">ALERT BROADCASTED!</span>
                  <p className="text-gray-500 text-xs mt-1">Your emergency contacts have been notified.</p>
                </div>

                {/* WhatsApp Links */}
                {whatsappLinks.length > 0 && (
                  <div className="mb-6">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-3 ml-1 tracking-widest">Manual Share via WhatsApp</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {whatsappLinks.map((link, index) => (
                        <button
                          key={index}
                          onClick={() => openWhatsApp(link.whatsappUrl)}
                          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-3 px-4 rounded-xl transition shadow-md flex items-center justify-between group active:scale-95"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-sm leading-none mb-1 group-hover:scale-105 transition-transform">{link.name}</span>
                            <span className="text-[10px] opacity-80 font-medium tracking-wider">{link.phone}</span>
                          </div>
                          <Radio size={18} className="opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setShowSOSModal(false)}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-2xl transition border border-gray-700 active:scale-95 shadow-lg"
                >
                  Close Window
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SOSButton;
