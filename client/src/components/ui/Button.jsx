import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick,
  type = 'button',
  disabled = false,
  ...props 
}) => {
  const baseStyles = `
    px-6 py-3 rounded-xl font-bold
    transition-all duration-200
    flex items-center justify-center gap-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-orange-600 to-red-600
      hover:from-orange-700 hover:to-red-700
      text-white
      shadow-lg hover:shadow-orange-500/30 hover:shadow-xl
      border border-orange-500/20
    `,
    secondary: `
      bg-transparent
      border-2 border-orange-500/50
      text-orange-500
      hover:bg-orange-500/10 hover:border-orange-500
      shadow-md hover:shadow-orange-500/20
    `,
    ghost: `
      bg-gray-800/50 backdrop-blur-sm
      text-gray-300
      hover:bg-gray-700/50 hover:text-white
      border border-gray-700/50 hover:border-gray-600
    `
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
