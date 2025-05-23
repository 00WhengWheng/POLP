import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fetchUserBadges, setBadgeFilters } from '../features/badges/badgeSlice';
import { fetchUserVisits } from '../features/visits/visitSlice';
import BadgeCard from '../components/BadgeCard';
import VisitButton from '../components/VisitButton';
import Loader from '../components/Loader';
import { format } from '../lib/format';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.user);
  const { badges, isLoading: badgesLoading, filters } = useSelector(state => state.badges);
  const { visits, isLoading: visitsLoading } = useSelector(state => state.visits);
  
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedBadge, setSelectedBadge] = useState(null);

  useEffect(() => {
    dispatch(fetchUserBadges());
    dispatch(fetchUserVisits());
  }, [dispatch]);

  const filteredBadges = badges.filter(badge => {
    if (filters.filterType === 'all') return true;
    return badge.badgeType === filters.filterType;
  });

  const recentVisits = visits.slice(0, 5);
  const claimableBadges = badges.filter(badge => badge.claimable && !badge.claimed);

  const stats = [
    {
      label: 'Total Visits',
      value: user?.stats?.totalVisits || visits.length,
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      ),
      color: 'blue'
    },
    {
      label: 'Badges Earned',
      value: user?.stats?.badgesEarned || badges.filter(b => b.claimed).length,
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm10-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1h8V5zM4 15V9h12v6H4z" clipRule="evenodd" />
        </svg>
      ),
      color: 'green'
    },
    {
      label: 'Unique Locations',
      value: user?.stats?.uniqueLocations || new Set(visits.map(v => v.locationId)).size,
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
        </svg>
      ),
      color: 'purple'
    },
    {
      label: 'Total Points',
      value: user?.stats?.totalPoints || badges.reduce((sum, b) => sum + (b.points || 0), 0),
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ),
      color: 'yellow'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'badges', label: 'Badges', icon: '🏆' },
    { id: 'visits', label: 'Visits', icon: '📍' },
    { id: 'activity', label: 'Activity', icon: '📈' }
  ];

  const badgeFilters = [
    { id: 'all', label: 'All Badges' },
    { id: 'location', label: 'Location' },
    { id: 'achievement', label: 'Achievement' },
    { id: 'special', label: 'Special' }
  ];

  const handleBadgeView = (badge) => {
    setSelectedBadge(badge);
  };

  const handleFilterChange = (filterType) => {
    dispatch(setBadgeFilters({ filterType }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.displayName || format.truncateAddress(user?.walletAddress)}
              </h1>
              <p className="mt-2 text-gray-600">
                Track your POGPP journey and manage your verified locations
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <VisitButton className="sm:w-auto" />
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.05 }}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center">
                <div className={`
                  p-3 rounded-lg
                  ${stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    stat.color === 'green' ? 'bg-green-100 text-green-600' :
                    stat.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                    'bg-yellow-100 text-yellow-600'}
                `}>
                  {stat.icon}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Claimable Badges Alert */}
        {claimableBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8"
          >
            <div className="flex items-center">
              <svg className="w-8 h-8 text-blue-500 mr-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm10-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1h8V5zM4 15V9h12v6H4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900">
                  {claimableBadges.length} Badge{claimableBadges.length > 1 ? 's' : ''} Ready to Claim!
                </h3>
                <p className="text-blue-700">
                  You have earned new badges from your recent visits. Click below to claim them.
                </p>
              </div>
              <Link
                to="/claim"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Claim Now
              </Link>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <nav className="flex space-x-8 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {selectedTab === 'overview' && (
            <div className="space-y-8">
              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {visitsLoading ? (
                  <Loader />
                ) : recentVisits.length > 0 ? (
                  <div className="space-y-4">
                    {recentVisits.map((visit) => (
                      <div key={visit.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{visit.location || 'Unknown Location'}</p>
                            <p className="text-sm text-gray-500">{format.formatDate(visit.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">+{visit.points || 10} points</p>
                          <p className="text-xs text-gray-500">Visit completed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No recent activity</p>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'badges' && (
            <div className="space-y-6">
              {/* Badge Filters */}
              <div className="flex flex-wrap gap-2">
                {badgeFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterChange(filter.id)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${filters.filterType === filter.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Badges Grid */}
              {badgesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                      <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredBadges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBadges.map((badge) => (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      onView={handleBadgeView}
                      size="medium"
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm10-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1h8V5zM4 15V9h12v6H4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-gray-500 text-lg">No badges found</p>
                  <p className="text-gray-400 text-sm mt-2">Start visiting locations to earn your first badge!</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'visits' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Visit History</h3>
                {visitsLoading ? (
                  <Loader />
                ) : visits.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Points
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {visits.map((visit) => (
                          <tr key={visit.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {visit.location || 'Unknown Location'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {visit.coordinates && `${visit.coordinates.lat.toFixed(4)}, ${visit.coordinates.lng.toFixed(4)}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format.formatDate(visit.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              +{visit.points || 10}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Verified
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-500 text-lg">No visits yet</p>
                    <p className="text-gray-400 text-sm mt-2">Start your first visit to see your history here</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'activity' && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Overview</h3>
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                <p className="text-gray-500 text-lg">Activity charts coming soon</p>
                <p className="text-gray-400 text-sm mt-2">Track your POGPP journey with detailed analytics</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
