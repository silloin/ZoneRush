import React, { useState, useEffect } from 'react';

const XPNotification = ({ xp, reason }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (xp > 0) {
      setShow(true);
      setTimeout(() => setShow(false), 3000);
    }
  }, [xp]);

  if (!show) return null;

  return (
    <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
      <p className="font-bold text-lg">+{xp} XP</p>
      <p className="text-sm">{reason}</p>
    </div>
  );
};

export default XPNotification;
