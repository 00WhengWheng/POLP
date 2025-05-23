import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from '../lib/format';

const BadgeCard = ({ 
  badge, 
  onClaim, 
  onView, 
  showActions = true, 
  size = 'medium',
  variant = 'default' 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClaim = async () => {
    if (!onClaim) return;
    setIsLoading(true);
    try {
      await onClaim(badge);
    } catch (error) {
      console.error('Claim error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    small: 'w-48 h-60',
    medium: 'w-64 h-80',
    large: 'w-80 h-96'
  };

  const variantClasses = {
    default: 'bg-white border border-gray-200 shadow-md hover:shadow-lg',
    compact: 'bg-gray-50 border border-gray-100 shadow-sm hover:shadow-md',
    featured: 'bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg hover:shadow-xl'
  };

  return (
    <motion.div
      className={`
        relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer
        ${sizeClasses[size]} ${variantClasses[variant]}
      `}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onView && onView(badge)}
    >
      {/* Badge Image */}
      <div className="relative h-3/5 overflow-hidden">
        {!imageError ? (
          <img
            src={badge.imageUrl || badge.metadata?.image}
            alt={badge.name || `Badge #${badge.tokenId}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-300 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-xs text-gray-500">No Image</p>
            </div>
          </div>
        )}
        
        {/* Badge Status Indicator */}
        <div className="absolute top-3 right-3">
          {badge.claimed ? (
            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Claimed
            </div>
          ) : badge.claimable ? (
            <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium animate-pulse">
              Claimable
            </div>
          ) : (
            <div className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Locked
            </div>
          )}
        </div>

        {/* Rarity Indicator */}
        {badge.rarity && (
          <div className="absolute top-3 left-3">
            <div className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${badge.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                badge.rarity === 'epic' ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white' :
                badge.rarity === 'rare' ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white' :
                'bg-gray-200 text-gray-700'}
            `}>
              {badge.rarity}
            </div>
          </div>
        )}
      </div>

      {/* Badge Info */}
      <div className="p-4 h-2/5 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
            {badge.name || `Badge #${badge.tokenId}`}
          </h3>
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {badge.description || badge.metadata?.description}
          </p>
        </div>

        <div className="space-y-2">
          {/* Badge Details */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>Location:</span>
            <span className="text-right truncate ml-2">
              {badge.location || format.truncateAddress(badge.visitId)}
            </span>
          </div>
          
          {badge.mintedAt && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Minted:</span>
              <span>{format.formatDate(badge.mintedAt)}</span>
            </div>
          )}

          {/* Action Buttons */}
          {showActions && (
            <div className="flex gap-2 mt-3">
              {badge.claimable && !badge.claimed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClaim();
                  }}
                  disabled={isLoading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs py-2 px-3 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Claiming...' : 'Claim'}
                </button>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView && onView(badge);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-2 px-3 rounded-lg font-medium transition-colors"
              >
                View
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-sm text-gray-700">Claiming...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BadgeCard;