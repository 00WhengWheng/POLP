import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { fetchUserBadges, claimBadge } from '../features/badges/badgeSlice';
import BadgeCard from '../components/BadgeCard';
import Loader from '../components/Loader';

const Claim = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { badges, isLoading, claimingBadges } = useSelector(state => state.badges);
  const { user } = useSelector(state => state.user);
  
  const [selectedBadges, setSelectedBadges] = useState([]);
  const [claimingAll, setClaimingAll] = useState(false);

  useEffect(() => {
    dispatch(fetchUserBadges());
  }, [dispatch]);

  const claimableBadges = badges.filter(badge => badge.claimable && !badge.claimed);
  const hasPendingClaims = claimableBadges.length > 0;

  const handleBadgeSelect = (badge) => {
    setSelectedBadges(prev => 
      prev.find(b => b.id === badge.id)
        ? prev.filter(b => b.id !== badge.id)
        : [...prev, badge]
    );
  };

  const handleClaimSingle = async (badge) => {
    try {
      await dispatch(claimBadge(badge.id));
    } catch (error) {
      console.error('Failed to claim badge:', error);
    }
  };

  const handleClaimSelected = async () => {
    if (selectedBadges.length === 0) return;
    
    setClaimingAll(true);
    try {
      for (const badge of selectedBadges) {
        await dispatch(claimBadge(badge.id));
      }
      setSelectedBadges([]);
    } catch (error) {
      console.error('Failed to claim badges:', error);
    } finally {
      setClaimingAll(false);
    }
  };

  const handleClaimAll = async () => {
    setClaimingAll(true);
    try {
      for (const badge of claimableBadges) {
        await dispatch(claimBadge(badge.id));
      }
      setSelectedBadges([]);
    } catch (error) {
      console.error('Failed to claim all badges:', error);
    } finally {
      setClaimingAll(false);
    }
  };

  const totalPoints = selectedBadges.reduce((sum, badge) => sum + (badge.points || 0), 0);
  const allClaimablePoints = claimableBadges.reduce((sum, badge) => sum + (badge.points || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Claim Your Badges
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {hasPendingClaims 
              ? `You have ${claimableBadges.length} badge${claimableBadges.length > 1 ? 's' : ''} ready to claim from your verified visits.`
              : 'All your badges have been claimed! Visit new locations to earn more.'
            }
          </p>
        </motion.div>

        {hasPendingClaims && (
          <>
            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6 mb-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {claimableBadges.length}
                  </div>
                  <div className="text-sm text-gray-600">Available Badges</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    +{allClaimablePoints}
                  </div>
                  <div className="text-sm text-gray-600">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {selectedBadges.length}
                  </div>
                  <div className="text-sm text-gray-600">Selected</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {new Set(claimableBadges.map(b => b.rarity)).size}
                  </div>
                  <div className="text-sm text-gray-600">Rarities</div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 mb-8"
            >
              <button
                onClick={handleClaimAll}
                disabled={claimingAll || claimableBadges.length === 0}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
              >
                {claimingAll ? (
                  <div className="flex items-center justify-center">
                    <Loader size="small" color="white" />
                    <span className="ml-2">Claiming All...</span>
                  </div>
                ) : (
                  `Claim All ${claimableBadges.length} Badges (+${allClaimablePoints} points)`
                )}
              </button>
              
              {selectedBadges.length > 0 && (
                <button
                  onClick={handleClaimSelected}
                  disabled={claimingAll}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {claimingAll ? (
                    <div className="flex items-center justify-center">
                      <Loader size="small" color="white" />
                      <span className="ml-2">Claiming...</span>
                    </div>
                  ) : (
                    `Claim Selected ${selectedBadges.length} (+${totalPoints} points)`
                  )}
                </button>
              )}
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSelectedBadges(claimableBadges)}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedBadges([])}
                  className="text-gray-600 hover:text-gray-700 font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </motion.div>

            {/* Badges Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {claimableBadges.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                  className="relative"
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-4 left-4 z-10">
                    <button
                      onClick={() => handleBadgeSelect(badge)}
                      className={`
                        w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
                        ${selectedBadges.find(b => b.id === badge.id)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-gray-300 hover:border-blue-400'
                        }
                      `}
                    >
                      {selectedBadges.find(b => b.id === badge.id) && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Badge Card */}
                  <div className={`
                    transition-all duration-300 cursor-pointer
                    ${selectedBadges.find(b => b.id === badge.id)
                      ? 'ring-4 ring-blue-500 ring-opacity-50 transform scale-105'
                      : 'hover:transform hover:scale-105'
                    }
                  `}>
                    <BadgeCard
                      badge={badge}
                      onClaim={() => handleClaimSingle(badge)}
                      size="medium"
                      variant={selectedBadges.find(b => b.id === badge.id) ? 'featured' : 'default'}
                    />
                  </div>

                  {/* Loading Overlay */}
                  {claimingBadges.includes(badge.id) && (
                    <div className="absolute inset-0 bg-black bg-opacity-20 rounded-xl flex items-center justify-center">
                      <div className="bg-white rounded-lg p-4 flex items-center space-x-2">
                        <Loader size="small" />
                        <span className="text-sm text-gray-700">Claiming...</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* No Claimable Badges */}
        {!hasPendingClaims && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-16"
          >
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm10-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1h8V5zM4 15V9h12v6H4z" clipRule="evenodd" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                All badges claimed!
              </h3>
              <p className="text-gray-600 mb-8">
                You've successfully claimed all your available badges. Visit new locations to earn more NFT badges and expand your collection.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/visit')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Start New Visit
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              About NFT Badge Claiming
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              When you claim badges, they are minted as ERC-721 NFTs on the Gnosis Chain and transferred to your wallet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Decentralized</h3>
              <p className="text-sm text-gray-600">
                Your badges are minted on Gnosis Chain, ensuring true ownership and decentralization.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure</h3>
              <p className="text-sm text-gray-600">
                Each badge contains cryptographic proof of your verified location visit.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Valuable</h3>
              <p className="text-sm text-gray-600">
                Collect rare and unique badges to showcase your global exploration journey.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Claim;
