import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Calendar, Users, Trophy, Flag, Clock, ChevronRight, Target, Award, Zap, Plus, X } from 'lucide-react';

const Events = () => {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, upcoming, ended
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal_type: 'distance',
    goal_value: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get('/events');
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getSafeId = (id) => {
    const n = parseInt(id, 10);
    if (!Number.isInteger(n) || n <= 0) throw new Error('Invalid ID');
    return n;
  };

  const joinEvent = async (eventId) => {
    try {
      const safeId = getSafeId(eventId);
      await axios.post(`/events/join/${safeId}`);
      fetchEvents();
      alert('Joined event successfully!');
    } catch (err) {
      if (err.message === 'Invalid ID') {
        alert('Invalid event ID');
      } else {
        alert(err.response?.data?.msg || 'Failed to join event');
      }
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.description || !formData.goal_value || !formData.end_date) {
      alert('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      await axios.post('/events', formData);
      
      alert('✅ Event created successfully!');
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        goal_type: 'distance',
        goal_value: '',
        start_date: '',
        end_date: ''
      });
      fetchEvents(); // Refresh events list
    } catch (err) {
      console.error('Error creating event:', err);
      alert(err.response?.data?.msg || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  // Filter events based on status
  const filteredEvents = events.filter(event => {
    const now = new Date();
    const endDate = new Date(event.end_date || event.enddate);
    const startDate = new Date(event.start_date || event.startdate);
    
    if (filter === 'active') {
      return startDate <= now && endDate > now;
    } else if (filter === 'upcoming') {
      return startDate > now;
    } else if (filter === 'ended') {
      return endDate <= now;
    }
    return true; // 'all'
  });

  // Separate into categories
  const activeEvents = events.filter(event => {
    const now = new Date();
    const endDate = new Date(event.end_date || event.enddate);
    const startDate = new Date(event.start_date || event.startdate);
    return startDate <= now && endDate > now;
  });

  const upcomingEvents = events.filter(event => {
    const now = new Date();
    const startDate = new Date(event.start_date || event.startdate);
    return startDate > now;
  });

  if (loading) return (
    <div className="p-8 text-white flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black mb-2 flex items-center gap-3">
              <Flag className="text-red-500" size={36} /> 
              Active Challenges & Events
            </h1>
            <p className="text-gray-400">Join challenges, compete with friends, and earn rewards!</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105"
          >
            <Plus size={20} />
            Create Event
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition flex items-center gap-2 ${
              filter === 'active' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Zap size={16} />
            Active Now ({activeEvents.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition flex items-center gap-2 ${
              filter === 'upcoming' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Calendar size={16} />
            Upcoming ({upcomingEvents.length})
          </button>
        </div>

        {/* Active Challenges Section */}
        {filter === 'all' && activeEvents.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-green-500 rounded-full"></div>
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Zap className="text-green-500" size={28} />
                Active Challenges
              </h2>
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold">
                {activeEvents.length} Live
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  user={user} 
                  onJoin={joinEvent}
                  status="active"
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events Section */}
        {filter === 'all' && upcomingEvents.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-purple-500 rounded-full"></div>
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Calendar className="text-purple-500" size={28} />
                Upcoming Events
              </h2>
              <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-bold">
                {upcomingEvents.length} Coming Soon
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  user={user} 
                  onJoin={joinEvent}
                  status="upcoming"
                />
              ))}
            </div>
          </div>
        )}

        {/* Filtered View */}
        {filter !== 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const now = new Date();
                const endDate = new Date(event.end_date || event.enddate);
                const startDate = new Date(event.start_date || event.startdate);
                const status = startDate <= now && endDate > now ? 'active' : 
                              startDate > now ? 'upcoming' : 'ended';
                
                return (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    user={user} 
                    onJoin={joinEvent}
                    status={status}
                  />
                );
              })
            ) : (
              <div className="col-span-full bg-gray-800 p-12 rounded-xl text-center">
                <Calendar className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-gray-400 text-lg">No {filter} events at the moment.</p>
                <button
                  onClick={() => setFilter('all')}
                  className="mt-4 text-blue-400 hover:text-blue-300 font-bold"
                >
                  View all events →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {filter === 'all' && events.length === 0 && (
          <div className="bg-gray-800 p-12 rounded-xl text-center">
            <Flag className="mx-auto mb-4 text-gray-600" size={64} />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No Events Yet</h3>
            <p className="text-gray-500">Be the first to create a challenge!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold inline-flex items-center gap-2"
            >
              <Plus size={18} /> Create Event
            </button>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2">
                  <Trophy className="text-yellow-500" size={28} />
                  Create New Challenge
                </h2>
                <p className="text-gray-400 text-sm mt-1">Set up a challenge for the community</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateEvent} className="p-6 space-y-6">
              {/* Event Name */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Running Challenge 2026"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your challenge..."
                  rows={4}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Goal Type & Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    Goal Type *
                  </label>
                  <select
                    value={formData.goal_type}
                    onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="distance">Distance (km)</option>
                    <option value="time">Time (minutes)</option>
                    <option value="steps">Steps</option>
                    <option value="calories">Calories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    Goal Value *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.goal_value}
                    onChange={(e) => setFormData({ ...formData, goal_value: e.target.value })}
                    placeholder="e.g., 50"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    Start Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-xs text-gray-500 mt-1">Defaults to now if not set</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300 flex items-start gap-2">
                  <Zap size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    You'll be automatically added as the first participant. Share this challenge with friends to compete together!
                  </span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-3 rounded-lg font-bold transition-all hover:shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Trophy size={18} />
                      Create Challenge
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Event Card Component
const EventCard = ({ event, user, onJoin, status }) => {
  const isParticipant = (event.participants || []).includes(user?.id);
  const endDate = new Date(event.end_date || event.enddate);
  const startDate = new Date(event.start_date || event.startdate);
  const now = new Date();
  
  const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
  const hoursUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60));

  const getStatusColor = () => {
    if (status === 'active') return 'green';
    if (status === 'upcoming') return 'purple';
    return 'gray';
  };

  const color = getStatusColor();

  // Format date and time
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-${color}-500/30 hover:border-${color}-500 transition-all duration-300 hover:transform hover:scale-105`}>
      {/* Status Badge */}
      <div className={`bg-${color}-600 text-white px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-between`}>
        <span className="flex items-center gap-2">
          {status === 'active' && <Zap size={14} />}
          {status === 'upcoming' && <Calendar size={14} />}
          {status === 'ended' && <Award size={14} />}
          {status}
        </span>
        <span>
          {status === 'active' && (daysLeft > 0 ? `${daysLeft}d left` : 'Ending today')}
          {status === 'upcoming' && (daysUntilStart > 1 ? `Starts in ${daysUntilStart}d` : hoursUntilStart > 0 ? `Starts in ${hoursUntilStart}h` : 'Starting soon')}
          {status === 'ended' && 'Ended'}
        </span>
      </div>

      <div className="p-6">
        {/* Title & Type */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-black text-white leading-tight">{event.name}</h3>
        </div>
        
        <p className="text-gray-400 mb-6 text-sm line-clamp-2">{event.description}</p>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center text-gray-300 text-sm">
              <Users className="mr-2 text-blue-400" size={16} />
              <span className="font-bold">{(event.participants || []).length}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Participants</p>
          </div>
          
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center text-gray-300 text-sm">
              <Target className="mr-2 text-yellow-500" size={16} />
              <span className="font-bold">{event.goal_value || event.goalvalue}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{event.goal_type || event.goaltype}</p>
          </div>
          
          {/* Start Date/Time */}
          <div className="bg-gray-700/50 rounded-lg p-3 col-span-2">
            <div className="flex items-start text-gray-300 text-sm gap-2">
              <Clock className="mt-0.5 text-green-400 flex-shrink-0" size={16} />
              <div className="flex-1">
                <div className="text-xs">
                  <span className="text-gray-400">Starts:</span>{' '}
                  <span className="font-semibold">{formatDate(startDate)}</span> at{' '}
                  <span className="font-semibold">{formatTime(startDate)}</span>
                </div>
                <div className="text-xs mt-1">
                  <span className="text-gray-400">Ends:</span>{' '}
                  <span className="font-semibold">{formatDate(endDate)}</span> at{' '}
                  <span className="font-semibold">{formatTime(endDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {isParticipant ? (
          <div className={`w-full bg-${color}-600/20 text-${color}-400 p-3 rounded-lg text-center font-bold flex items-center justify-center gap-2 border border-${color}-500/30`}>
            <Trophy size={18} /> 
            {status === 'active' ? 'Participating' : status === 'upcoming' ? 'Registered' : 'Completed'}
          </div>
        ) : status !== 'ended' ? (
          <button
            onClick={() => onJoin(event.id)}
            className={`w-full bg-${color}-600 hover:bg-${color}-700 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-${color}-500/50`}
          >
            Join Now <ChevronRight size={18} />
          </button>
        ) : (
          <div className="w-full bg-gray-700 text-gray-400 p-3 rounded-lg text-center font-bold">
            Event Ended
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
