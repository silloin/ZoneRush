import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import { FaRunning, FaRobot } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Trophy, Map as MapIcon, Activity, TrendingUp, Calendar, Upload, MessageSquare, Lightbulb, Send, Bot, User } from 'lucide-react';
import Card from '../components/ui/Card';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [tileCount, setTileCount] = useState(0);
  
  // AI Coach Chat State
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your AI Running Coach. Ask me anything about training, nutrition, or running tips! 🏃‍♂️' }
  ]);
  const [userQuestion, setUserQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);


  useEffect(() => {
    fetchRuns();
    if (user?.id) {
      fetchTileCount();
      fetchRecommendations();
    }
  }, [user]);


  const fetchTileCount = async () => {
    try {
      if (!user?.id) return;
      const res = await axios.get(`/tiles/count/${user.id}`);
      setTileCount(res.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch tile count:', err);
      setTileCount(0);
    }
  };

  const fetchRecommendations = async () => {
    try {
      if (!user?.id) return;
      const res = await axios.get(`/ai-coach/recommendations/${user.id}`);
      if (Array.isArray(res.data)) {
        setRecommendations(res.data);
      } else {
        console.error('Recommendations API response is not an array:', res.data);
        setRecommendations([]);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setRecommendations([]);
    }
  };


  const fetchRuns = async () => {
    try {
      const res = await axios.get('/runs');
      if (Array.isArray(res.data)) {
        setRuns(res.data);
      } else {
        console.error('API response is not an array:', res.data);
        setRuns([]);
      }
    } catch (err) {
      console.error('Failed to fetch runs:', err.response?.status, err.response?.data || err.message);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAskCoach = async (e) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;

    const question = userQuestion.trim();
    setUserQuestion('');
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsTyping(true);

    try {
      // Call AI Coach API with full conversation history
      const response = await axios.post('/ai-coach/chat', {
        userId: user.id,
        question: question,
        context: {
          totalRuns: runs.length,
          avgPace: avgPace,
          totalDistance: totalDistance
        },
        conversationHistory: chatMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      });

      // Add AI response to chat
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.answer || 'Sorry, I couldn\'t process that. Try asking about training tips, nutrition, or running advice!' 
      }]);
    } catch (error) {
      console.error('AI Coach error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Oops! Something went wrong. Please try again.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedQuestions = [
    "How can I improve my pace?",
    "What should I eat before a run?",
    "How many rest days do I need?",
    "Tips for running in hot weather?"
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('gpxFile', file);

    setUploading(true);
    try {
      await axios.post('/gpx/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('GPX file uploaded and processed!');
      fetchRuns();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload GPX file');
    }
    setUploading(false);
  };

  if (loading) return <div className="p-8 text-white">Loading stats...</div>;

  const chartData = runs.slice(0, 7).reverse().map((run, idx) => ({
    date: `Run ${idx + 1}`,
    distance: parseFloat(run.distance || 0),
    pace: parseFloat(run.avgpace || 0),
  }));

  const avgPace = runs.length > 0 
    ? (runs.reduce((acc, run) => acc + parseFloat(run.avgpace || 0), 0) / runs.length).toFixed(2)
    : '0.00';

  const totalDistance = runs.length > 0
    ? runs.reduce((acc, run) => acc + parseFloat(run.distance || 0), 0).toFixed(2)
    : '0.00';

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-900/50 min-h-screen text-white page-enter">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black gradient-text">Runner Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Track your progress and get AI-powered coaching</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <label className="flex items-center space-x-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 p-2 px-4 rounded-xl cursor-pointer transition w-full sm:w-auto justify-center shadow-lg hover:shadow-orange-500/30 hover:shadow-xl transform hover:scale-105">
            <Upload size={20} />
            <span className="text-sm sm:text-base font-semibold">{uploading ? 'Processing...' : 'Upload GPX'}</span>
            <input type="file" className="hidden" accept=".gpx" onChange={handleFileUpload} disabled={uploading} />
          </label>
          <div className="flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-2 px-4 rounded-xl w-full sm:w-auto justify-center">
            <Calendar className="text-orange-400" size={20} />
            <span className="text-sm sm:text-base">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-3 sm:p-6">
          <div className="flex items-center mb-2">
            <Trophy className="text-orange-500 mr-1 sm:mr-2" size={16} />
            <span className="text-gray-400 text-xs sm:text-sm font-semibold">Total Distance</span>
          </div>
          <p className="text-lg sm:text-3xl font-black">{totalDistance} km</p>
        </Card>
        <Card className="p-3 sm:p-6">
          <div className="flex items-center mb-2">
            <MapIcon className="text-red-500 mr-1 sm:mr-2" size={16} />
            <span className="text-gray-400 text-xs sm:text-sm font-semibold">Tiles Owned</span>
          </div>
          <p className="text-lg sm:text-3xl font-black">{tileCount}</p>
        </Card>
        <Card className="p-3 sm:p-6">
          <div className="flex items-center mb-2">
            <Activity className="text-orange-500 mr-1 sm:mr-2" size={16} />
            <span className="text-gray-400 text-xs sm:text-sm font-semibold">Total Runs</span>
          </div>
          <p className="text-lg sm:text-3xl font-black">{runs.length}</p>
        </Card>
        <Card className="p-3 sm:p-6">
          <div className="flex items-center mb-2">
            <TrendingUp className="text-red-500 mr-1 sm:mr-2" size={16} />
            <span className="text-gray-400 text-xs sm:text-sm font-semibold">Average Pace</span>
          </div>
          <p className="text-lg sm:text-3xl font-black">{avgPace} min/km</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
        {/* AI Coach Chat Card */}
        <Card className="p-4 sm:p-6 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gradient-text">
              <Lightbulb className="text-orange-400 mr-2" /> AI Running Coach
            </h2>
            <span className="text-xs bg-gradient-to-r from-orange-600 to-red-600 px-2 py-1 rounded shadow font-semibold">BETA</span>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
            {chatMessages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-lg p-3 ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg' 
                    : 'bg-gray-900/70 text-gray-200 border border-orange-500/20 markdown-content'
                }`}>
                  <div className="flex items-start space-x-2">
                    {msg.role === 'assistant' && (
                      <FaRobot className="mt-0.5 flex-shrink-0 text-orange-400 text-lg" />
                    )}
                    <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        <span className="flex items-center gap-2">
                          <FaRunning className="text-white" />
                          {msg.content}
                        </span>
                      )}
                    </div>
                    {msg.role === 'user' && <User size={16} className="mt-0.5 flex-shrink-0" />}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <FaRobot className="text-blue-400 text-lg" />
                    <TypeAnimation
                      sequence={[
                        'AI Coach is typing',
                        500,
                        'AI Coach is typing.',
                        500,
                        'AI Coach is typing..',
                        500,
                        'AI Coach is typing...',
                      ]}
                      wrapper="span"
                      speed={50}
                      repeat={Infinity}
                      className="text-sm text-gray-400"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Suggested Questions */}
          {chatMessages.length <= 1 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setUserQuestion(q)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-full transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Chat Input */}
          <form onSubmit={handleAskCoach} className="flex space-x-2">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="Ask your coach..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!userQuestion.trim() || isTyping}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </form>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 gradient-text">Distance (Last 7 Runs)</h2>
          <div className="h-48 sm:h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', fontSize: '12px' }} />
                  <Bar dataKey="distance" fill="#ff6b35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No runs yet</div>
            )}
          </div>
        </Card>
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 gradient-text">Pace Trend (Last 7 Runs)</h2>
          <div className="h-48 sm:h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="pace" stroke="#f44336" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No runs yet</div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 gradient-text">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-2 text-xs sm:text-sm">Run #</th>
                <th className="py-2 text-xs sm:text-sm">Distance (km)</th>
                <th className="py-2 text-xs sm:text-sm hidden sm:table-cell">Duration</th>
                <th className="py-2 text-xs sm:text-sm">Avg Pace</th>
              </tr>
            </thead>
            <tbody>
              {runs.length > 0 ? (
                runs.slice(0, 5).map((run, idx) => (
                  <tr key={run.id} className="border-b border-gray-700/50 hover:bg-gray-800/50 transition">
                    <td className="py-3 text-xs sm:text-sm">#{idx + 1}</td>
                    <td className="py-3 font-medium text-xs sm:text-sm">{parseFloat(run.distance || 0).toFixed(2)}</td>
                    <td className="py-3 text-xs sm:text-sm hidden sm:table-cell">{Math.floor(run.duration / 60)}m {run.duration % 60}s</td>
                    <td className="py-3 text-xs sm:text-sm">{parseFloat(run.avgpace || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-3 text-center text-gray-400 text-xs sm:text-sm">No runs yet. Start running to see your stats!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
