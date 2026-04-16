import React from 'react';

const Input = ({ 
  label, 
  className = '', 
  error,
  id,
  type = 'text',
  ...props 
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-gray-300 mb-2 text-sm font-medium"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`
          w-full px-4 py-3
          bg-gray-800/70 backdrop-blur-sm
          border border-gray-700/50
          rounded-xl
          text-white
          placeholder-gray-500
          transition-all duration-200
          focus:outline-none
          focus:ring-2 focus:ring-orange-500/50
          focus:border-orange-500
          hover:border-gray-600
          ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Input;
