import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Bell } from 'lucide-react';

const IntervalTimer = ({ onClose }) => {
  const [fastTime, setFastTime] = useState(60); // 1 min fast
  const [slowTime, setSlowTime] = useState(120); // 2 min slow
  const [cycles, setCycles] = useState(5); // 5 cycles
  const [currentCycle, setCurrentCycle] = useState(1);
  const [timeLeft, setTimeLeft] = useState(fastTime);
  const [isFast, setIsFast] = useState(true);
  const [isActive, setIsActive] = useState(false);
  
  const timerId = useRef(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerId.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // Transition between fast and slow
      if (isFast) {
        setIsFast(false);
        setTimeLeft(slowTime);
        alert('Switch to SLOW mode!');
      } else {
        if (currentCycle < cycles) {
          setIsFast(true);
          setTimeLeft(fastTime);
          setCurrentCycle((prev) => prev + 1);
          alert('Switch to FAST mode!');
        } else {
          setIsActive(false);
          alert('Interval workout complete!');
        }
      }
    } else {
      clearInterval(timerId.current);
    }
    return () => clearInterval(timerId.current);
  }, [isActive, timeLeft, isFast, currentCycle, cycles, fastTime, slowTime]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setIsFast(true);
    setCurrentCycle(1);
    setTimeLeft(fastTime);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center">
          <Timer className="mr-2 text-blue-400" /> Interval Workout
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase absolute top-6 right-12 ${
        isFast ? 'bg-red-600' : 'bg-blue-600'
      }`}>
        {isFast ? 'FAST' : 'SLOW'}
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="text-6xl font-mono font-bold mb-2">
          {formatTime(timeLeft)}
        </div>
        <div className="text-gray-400">
          Cycle {currentCycle} of {cycles}
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={toggleTimer}
          className={`p-4 rounded-full transition ${
            isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isActive ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          onClick={resetTimer}
          className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition"
        >
          <RotateCcw size={24} />
        </button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="fastTime" className="block text-xs text-gray-400 mb-1">Fast (s)</label>
          <input
            id="fastTime"
            type="number"
            value={fastTime}
            onChange={(e) => setFastTime(parseInt(e.target.value))}
            className="w-full bg-gray-700 p-2 rounded text-sm"
          />
        </div>
        <div>
          <label htmlFor="slowTime" className="block text-xs text-gray-400 mb-1">Slow (s)</label>
          <input
            id="slowTime"
            type="number"
            value={slowTime}
            onChange={(e) => setSlowTime(parseInt(e.target.value))}
            className="w-full bg-gray-700 p-2 rounded text-sm"
          />
        </div>
        <div>
          <label htmlFor="cycles" className="block text-xs text-gray-400 mb-1">Cycles</label>
          <input
            id="cycles"
            type="number"
            value={cycles}
            onChange={(e) => setCycles(parseInt(e.target.value))}
            className="w-full bg-gray-700 p-2 rounded text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default IntervalTimer;
