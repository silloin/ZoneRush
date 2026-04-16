import React from 'react';

/**
 * Avatar Component - Shows profile picture or first letter of username
 * 
 * @param {string} imageUrl - URL of the profile image
 * @param {string} username - Username to show first letter if no image
 * @param {string} size - Size of avatar (sm, md, lg, xl)
 * @param {string} className - Additional CSS classes
 */
const Avatar = ({ imageUrl, username, size = 'md', className = '' }) => {
  const [imageError, setImageError] = React.useState(false);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-8 h-8 text-sm',
      font: 'text-sm'
    },
    md: {
      container: 'w-10 h-10 text-base',
      font: 'text-lg'
    },
    lg: {
      container: 'w-16 h-16 text-xl',
      font: 'text-2xl'
    },
    xl: {
      container: 'w-24 h-24 text-3xl sm:w-32 sm:h-32 sm:text-5xl',
      font: 'text-3xl sm:text-5xl'
    }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  // Show image only if imageUrl exists and no error
  const showImage = imageUrl && !imageError;

  return (
    <div className={`relative ${className}`}>
      {showImage ? (
        <img
          src={imageUrl}
          alt={username || 'User'}
          className={`${config.container} rounded-full object-cover border-2 border-orange-500/50 shadow-lg`}
          onError={handleImageError}
        />
      ) : (
        <div
          className={`${config.container} bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center font-bold border-2 border-orange-500/50 shadow-lg`}
        >
          {username ? username[0].toUpperCase() : '?'}
        </div>
      )}
    </div>
  );
};

export default Avatar;
