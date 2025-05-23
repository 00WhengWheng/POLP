import React from 'react';

// Loading spinner component
const Loader = ({ 
  size = 'medium', 
  color = 'blue', 
  text = '', 
  fullScreen = false,
  overlay = false 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
    red: 'text-red-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  const spinnerClass = `${sizeClasses[size]} ${colorClasses[color]} animate-spin`;

  const SpinnerIcon = () => (
    <svg className={spinnerClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const content = (
    <div className="flex flex-col items-center justify-center space-y-2">
      <SpinnerIcon />
      {text && (
        <p className={`text-sm ${colorClasses[color]} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        {content}
      </div>
    );
  }

  return content;
};

// Skeleton loader for content placeholders
export const SkeletonLoader = ({ className = '', lines = 3 }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded h-4 mb-2 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

// Card skeleton loader
export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
};

// Button loader
export const ButtonLoader = ({ size = 'medium', color = 'white' }) => {
  const sizeClasses = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  return (
    <svg 
      className={`${sizeClasses[size]} ${color === 'white' ? 'text-white' : 'text-current'} animate-spin`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Dots loader animation
export const DotsLoader = ({ color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    gray: 'bg-gray-600'
  };

  return (
    <div className="flex space-x-1 justify-center items-center">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`w-2 h-2 ${colorClasses[color]} rounded-full animate-bounce`}
          style={{ animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </div>
  );
};

// Progress bar loader
export const ProgressLoader = ({ 
  progress = 0, 
  color = 'blue', 
  showPercentage = true,
  className = '' 
}) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    gray: 'bg-gray-600'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">Progress</span>
        {showPercentage && (
          <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
};

// Pulse loader for images
export const ImageLoader = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
};

// Loading state wrapper
export const LoadingWrapper = ({ 
  loading, 
  children, 
  loader = <Loader />,
  overlay = false 
}) => {
  if (!loading) {
    return children;
  }

  return (
    <div className="relative">
      {children}
      {overlay ? (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          {loader}
        </div>
      ) : (
        loader
      )}
    </div>
  );
};

export default Loader;