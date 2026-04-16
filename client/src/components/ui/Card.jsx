import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = '', hover = true, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { scale: 1.02, y: -2 } : {}}
      className={`
        bg-gray-800/50 backdrop-blur-xl
        border border-gray-700/50
        rounded-2xl
        shadow-lg
        transition-all duration-200
        ${hover ? 'hover:border-orange-500/50 hover:shadow-orange-500/10 hover:shadow-xl' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
