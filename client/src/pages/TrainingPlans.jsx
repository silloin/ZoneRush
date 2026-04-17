import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, CheckCircle, Circle, ArrowRight, Play, Sparkles, Brain } from 'lucide-react';

const TrainingPlans = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAIGeneration, setShowAIGeneration] = useState(false);
  const [aiPreferences, setAiPreferences] = useState({
    goal: '',
    availableDays: [],
    preferredTime: 'morning',
    maxDistancePerWeek: 30
  });

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/training-plans/current', {
        headers: { 'x-auth-token': token }
      });
      
      const savedPlan = res.data;
      if (savedPlan && savedPlan.metadata?.isAI) {
        // Reconstruct AI plan structure from saved database data
        const reconstructedPlan = {
          ...savedPlan,
          weeklyPlans: savedPlan.workouts || [],
          goal: savedPlan.metadata?.goal,
          duration: savedPlan.metadata?.duration,
          tips: savedPlan.metadata?.tips,
          warnings: savedPlan.metadata?.warnings,
          isAI: true
        };
        setPlan(reconstructedPlan);
      } else {
        setPlan(savedPlan || null);
      }
    } catch (err) {
      console.error('Failed to fetch plan:', err);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const getSafeId = (id) => {
    // Handle both numeric IDs and string IDs (like MongoDB ObjectIds)
    if (!id) throw new Error('Invalid ID');
    
    // If it's already a number, validate it
    if (typeof id === 'number') {
      if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid ID');
      return id;
    }
    
    // If it's a string, try to parse as number first
    if (typeof id === 'string') {
      const parsed = parseInt(id, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
      // If not a number, return as-is (could be UUID or ObjectId)
      // Validate it's a reasonable string format
      if (id.length > 0 && id.length < 100) {
        return id;
      }
    }
    
    throw new Error('Invalid ID');
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

  const generateAIPlan = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/training-plans/generate', { 
        useAI: true, 
        preferences: aiPreferences 
      }, {
        headers: { 'x-auth-token': token }
      });
      
      // Reconstruct plan structure from saved database data
      const savedPlan = res.data;
      const reconstructedPlan = {
        ...savedPlan,
        weeklyPlans: savedPlan.workouts || [],
        goal: savedPlan.metadata?.goal,
        duration: savedPlan.metadata?.duration,
        tips: savedPlan.metadata?.tips,
        warnings: savedPlan.metadata?.warnings,
        isAI: true
      };
      
      setPlan(reconstructedPlan || null);
      setShowAIGeneration(false);
    } catch (err) {
      console.error('Failed to generate AI plan:', err);
      alert('Failed to generate AI training plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    setAiPreferences(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  const ALLOWED_BASE = '/training-plans/workout/';

  const completeWorkout = async (workoutId) => {
    try {
      const safeId = getSafeId(workoutId);
      
      // Construct URL safely - handle both numeric and string IDs
      let urlPath;
      if (typeof safeId === 'number') {
        urlPath = `${ALLOWED_BASE}${safeId}`;
      } else {
        // For string IDs, ensure they're URL-safe
        urlPath = `${ALLOWED_BASE}${encodeURIComponent(safeId)}`;
      }
      
      const url = new URL(urlPath, window.location.origin);
      if (url.origin !== window.location.origin || !url.pathname.startsWith(ALLOWED_BASE)) {
        throw new Error('Invalid request URL');
      }
      
      const token = localStorage.getItem('token');
      const res = await axios.put(url.pathname, {}, {
        headers: { 'x-auth-token': token }
      });
      setPlan(res.data || null);
    } catch (err) {
      console.error('Failed to complete workout:', err);
      alert(err.message || 'Failed to mark workout as complete');
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-900 min-h-screen text-white">
        <div className="max-w-4xl mx-auto">
          {/* Skeleton Header */}
          <div className="animate-pulse mb-8">
            <div className="h-10 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
          
          {/* Skeleton Cards */}
          <div className="space-y-6">
            <div className="animate-pulse bg-gray-800 p-8 rounded-xl">
              <div className="h-8 bg-gray-700 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse bg-gray-800 p-8 rounded-xl">
                  <div className="h-6 bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-10 bg-gray-700 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <BookOpen className="mr-3 text-blue-500" size={32} /> Personalized Training Plans
        </h1>

        {!plan ? (
          <div className="space-y-8">
            {/* AI Plan Generation Option */}
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-8 rounded-xl border-2 border-purple-500 hover:border-purple-400 transition cursor-pointer"
                 onClick={() => setShowAIGeneration(!showAIGeneration)}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center">
                  <Brain className="mr-3 text-purple-400" size={28} />
                  AI-Powered Personalized Plan
                </h2>
                <Sparkles className="text-yellow-400" size={24} />
              </div>
              <p className="text-gray-300 mb-4">
                Let our AI coach analyze your running history and create a custom 4-week training plan tailored specifically for you!
              </p>
              <div className="flex items-center text-purple-400 font-bold">
                {showAIGeneration ? 'Hide Options' : 'Create My Plan'} <ArrowRight className="ml-2" size={20} />
              </div>
            </div>

            {/* AI Preferences Form */}
            {showAIGeneration && (
              <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 animate-fade-in">
                <h3 className="text-xl font-bold mb-6 text-purple-400">Customize Your AI Training Plan</h3>
                
                <div className="space-y-6">
                  {/* Goal Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2">What's your main goal?</label>
                    <input
                      type="text"
                      value={aiPreferences.goal}
                      onChange={(e) => setAiPreferences({...aiPreferences, goal: e.target.value})}
                      placeholder="e.g., Improve 5K time, Run first marathon, Build endurance..."
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none text-white"
                    />
                  </div>

                  {/* Available Days */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Which days can you train?</label>
                    <div className="grid grid-cols-7 gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(idx + 1)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                            aiPreferences.availableDays.includes(idx + 1)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Time */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Preferred training time</label>
                    <select
                      value={aiPreferences.preferredTime}
                      onChange={(e) => setAiPreferences({...aiPreferences, preferredTime: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none text-white"
                    >
                      <option value="morning">Morning (6-9 AM)</option>
                      <option value="afternoon">Afternoon (12-5 PM)</option>
                      <option value="evening">Evening (6-9 PM)</option>
                      <option value="anytime">Anytime</option>
                    </select>
                  </div>

                  {/* Max Distance */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Maximum weekly distance: {aiPreferences.maxDistancePerWeek} km
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={aiPreferences.maxDistancePerWeek}
                      onChange={(e) => setAiPreferences({...aiPreferences, maxDistancePerWeek: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generateAIPlan}
                    disabled={loading || !aiPreferences.goal}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Your Plan...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2" size={20} />
                        Generate My AI Plan
                      </>
                    )}
                  </button>
                  
                  {loading && (
                    <p className="text-sm text-gray-400 text-center mt-2">
                      This may take 10-30 seconds as our AI analyzes your running history...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Traditional Plans */}
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
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
            <div className="bg-gray-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-wide flex items-center">
                  {plan.isAI && <Brain className="mr-2 text-purple-400" size={24} />}
                  {(plan.planName || plan.plan_type || plan.planType) || 'Training'} Plan
                </h2>
                {plan.goal && (
                  <p className="text-purple-400 mt-1 font-medium">{plan.goal}</p>
                )}
                <p className="text-gray-300">Started on {new Date(plan.start_date || plan.startDate || Date.now()).toLocaleDateString()}</p>
                {plan.duration && (
                  <p className="text-sm text-gray-400 mt-1">Duration: {plan.duration}</p>
                )}
              </div>
              <button
                onClick={() => setPlan(null)}
                className="bg-red-600/20 text-red-500 px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition"
              >
                Reset Plan
              </button>
            </div>
            
            {/* AI Plan Tips & Warnings */}
            {plan.isAI && (
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-6 border-b border-gray-700">
                {plan.tips && plan.tips.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-bold text-purple-400 mb-2 flex items-center">
                      <Sparkles size={16} className="mr-2" />
                      Training Tips
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {plan.tips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-gray-300">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {plan.warnings && plan.warnings.length > 0 && (
                  <div>
                    <h3 className="font-bold text-yellow-400 mb-2">⚠️ Important Notes</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {plan.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-gray-300">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="p-6">
              <div className="space-y-4">
                {/* Display weekly plans for AI-generated plans */}
                {plan.weeklyPlans && plan.weeklyPlans.length > 0 ? (
                  plan.weeklyPlans.map((weekPlan) => (
                    <div key={weekPlan.week} className="mb-6">
                      <h3 className="text-lg font-bold text-blue-400 mb-3">Week {weekPlan.week}: {weekPlan.focus}</h3>
                      <div className="space-y-3">
                        {weekPlan.workouts.map((workout, idx) => (
                          <div
                            key={`${weekPlan.week}-${idx}`}
                            className={`flex items-start justify-between p-4 rounded-lg border transition ${
                              workout.completed 
                                ? 'bg-green-600/10 border-green-600/50' 
                                : 'bg-gray-750 border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start flex-1">
                              {workout.completed ? (
                                <CheckCircle className="text-green-500 mr-4 mt-1 flex-shrink-0" />
                              ) : (
                                <Circle className="text-gray-500 mr-4 mt-1 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className={`font-bold ${workout.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                                    Day {workout.day}: {workout.workoutType}
                                  </h4>
                                  {workout.intensity && (
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      workout.intensity === 'easy' ? 'bg-green-600/20 text-green-400' :
                                      workout.intensity === 'moderate' ? 'bg-yellow-600/20 text-yellow-400' :
                                      'bg-red-600/20 text-red-400'
                                    }`}>
                                      {workout.intensity}
                                    </span>
                                  )}
                                </div>
                                {workout.description && (
                                  <p className="text-sm text-gray-400 mb-2">{workout.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  {workout.distance > 0 && <span>📏 {workout.distance} km</span>}
                                  {workout.duration > 0 && <span>⏱️ {Math.round(workout.duration / 60)} mins</span>}
                                </div>
                                {workout.notes && (
                                  <p className="text-xs text-gray-500 mt-2 italic">{workout.notes}</p>
                                )}
                              </div>
                            </div>
                            
                            {!workout.completed && (
                              <button
                                onClick={() => completeWorkout(`${weekPlan.week}-${idx}`)}
                                className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full transition ml-4 flex-shrink-0"
                              >
                                <Play size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : Array.isArray(plan.workouts) && plan.workouts.length > 0 ? (
                  // Legacy format for template-based plans
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