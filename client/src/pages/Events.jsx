import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Calendar, Users, Trophy, Flag, Clock, ChevronRight } from 'lucide-react';

const Events = () => {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const joinEvent = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/events/join/${eventId}`, {}, {
        headers: { 'x-auth-token': token }
      });
      fetchEvents();
      alert('Joined event successfully!');
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to join event');
    }
  };

  if (loading) return <div className="p-8 text-white">Loading events...</div>;

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <Flag className="mr-3 text-red-500" size={32} /> Active Challenges & Events
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700 hover:border-blue-500 transition">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold">{event.name}</h2>
                    <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                      {event.goaltype}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 mb-6">{event.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center text-gray-300">
                      <Users className="mr-2 text-blue-400" size={18} />
                      <span>{(event.participants || []).length} Participants</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Trophy className="mr-2 text-yellow-500" size={18} />
                      <span>Goal: {event.goalvalue}</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Clock className="mr-2 text-green-400" size={18} />
                      <span>Ends: {new Date(event.enddate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {(event.participants || []).includes(user?.id) ? (
                    <div className="w-full bg-green-600/20 text-green-500 p-3 rounded-lg text-center font-bold flex items-center justify-center">
                      <Trophy className="mr-2" size={20} /> Already Participating
                    </div>
                  ) : (
                    <button
                      onClick={() => joinEvent(event.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold flex items-center justify-center transition"
                    >
                      Join Challenge <ChevronRight className="ml-2" size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-gray-800 p-12 rounded-xl text-center text-gray-400">
              No active events at the moment. Check back soon!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
