import React from 'react';

/**
 * Skeleton Loading Component
 * Shows placeholder loading animation while content loads
 * 
 * @param {string} type - Type of skeleton (text, card, circle, rect)
 * @param {string} width - Width of skeleton
 * @param {string} height - Height of skeleton
 * @param {string} className - Additional CSS classes
 * @param {number} count - Number of skeletons to show
 */
const Skeleton = ({ type = 'text', width = '100%', height, className = '', count = 1 }) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const getTypeClasses = () => {
    switch (type) {
      case 'text':
        return 'h-4 rounded';
      case 'text-lg':
        return 'h-6 rounded';
      case 'text-sm':
        return 'h-3 rounded';
      case 'circle':
        return 'rounded-full';
      case 'card':
        return 'h-32 rounded-2xl';
      case 'rect':
        return 'rounded';
      default:
        return 'h-4 rounded';
    }
  };

  return (
    <>
      {skeletons.map((i) => (
        <div
          key={i}
          className={`skeleton ${getTypeClasses()} ${className}`}
          style={{ width, height: height || 'auto' }}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

export default Skeleton;
