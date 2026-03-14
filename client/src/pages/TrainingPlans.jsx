import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, CheckCircle, Circle, ArrowRight, Play } from 'lucide-react';

const TrainingPlans = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/training-plans/current', {
        headers: { 'x-auth-token': token }
      });
      setPlan(res.data || null);
    } catch (err) {
      console.error('Failed to fetch plan:', err);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async (type) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/training-plans/generate', { planType: type }, {
        headers: { 'x-auth-token': token }
      });
      setPlan(res.data || null);
    } catch (err) {
      console.error('Failed to generate plan:', err);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const completeWorkout = async (workoutId) => {
    if (!workoutId || !Number.isInteger(Number(workoutId)) || Number(workoutId) <= 0) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`/training-plans/workout/${Number(workoutId)}`, {}, {
        headers: { 'x-auth-token': token }
      });
      setPlan(res.data || null);
    } catch (err) {
      console.error('Failed to complete workout:', err);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading training plans...</div>;

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <BookOpen className="mr-3 text-blue-500" size={32} /> Personalized Training Plans
        </h1>

        {!plan ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 hover:border-blue-500 transition cursor-pointer"
                 onClick={() => generatePlan('beginner')}>
              <h2 className="text-2xl font-bold mb-4">Beginner Plan</h2>
              <p className="text-gray-400 mb-6">Perfect for those just starting their running journey.</p>
              <div className="flex items-center text-blue-400 font-bold">
                Start Plan <ArrowRight className="ml-2" size={20} />
              </div>
            </div>
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 hover:border-green-500 transition cursor-pointer"
                 onClick={() => generatePlan('5k')}>
              <h2 className="text-2xl font-bold mb-4">5K Training Plan</h2>
              <p className="text-gray-400 mb-6">Designed to help you run your first 5K with confidence.</p>
              <div className="flex items-center text-green-400 font-bold">
                Start Plan <ArrowRight className="ml-2" size={20} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
            <div className="bg-gray-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-wide">{(plan.plan_type || plan.planType) || 'Training'} Plan</h2>
                <p className="text-gray-300">Started on {new Date(plan.start_date || plan.startDate || Date.now()).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setPlan(null)}
                className="bg-red-600/20 text-red-500 px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition"
              >
                Reset Plan
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {Array.isArray(plan.workouts) && plan.workouts.length > 0 ? (
                  plan.workouts.map((workout, idx) => (
                    <div
                      key={workout._id || workout.id || idx}
                      className={`flex items-center justify-between p-4 rounded-lg border transition ${
                        workout.completed ? 'bg-green-600/10 border-green-600/50' : 'bg-gray-750 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center">
                        {workout.completed ? (
                          <CheckCircle className="text-green-500 mr-4" />
                        ) : (
                          <Circle className="text-gray-500 mr-4" />
                        )}
                        <div>
                          <h3 className={`font-bold ${workout.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                            Day {workout.day || idx + 1}: {workout.workoutType || workout.type || 'Workout'}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {workout.distance ? `${workout.distance} km` : `${workout.duration || 30} mins`}
                          </p>
                        </div>
                      </div>
                      
                      {!workout.completed && (
                        <button
                          onClick={() => completeWorkout(workout._id || workout.id)}
                          className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full transition"
                        >
                          <Play size={16} />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">No workouts available</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingPlans;