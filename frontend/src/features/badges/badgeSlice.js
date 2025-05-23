import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/apiClient';

// Initial state
const initialState = {
  // Badge data
  badges: [],
  currentBadge: null,
  
  // Pagination
  totalCount: 0,
  hasMore: false,
  currentPage: 0,
  
  // Loading states
  loading: false,
  mintLoading: false,
  transferLoading: false,
  
  // Error states
  error: null,
  mintError: null,
  transferError: null,
  
  // Minting flow
  mintInProgress: null,
  
  // Collection stats
  collectionStats: {
    totalBadges: 0,
    uniqueHolders: 0,
    badgeTypes: 0,
    recentBadges: 0,
    rarityDistribution: {},
    typeDistribution: {}
  },
  
  // Leaderboard
  leaderboard: [],
  
  // Filter and search
  filterType: 'all', // all, location, achievement, special, milestone
  filterRarity: 'all', // all, common, uncommon, rare, epic, legendary
  sortBy: 'newest' // newest, oldest, rarity, type
};

// Async thunks

// Get user badges
export const getUserBadges = createAsyncThunk(
  'badges/getAll',
  async ({ limit = 50, offset = 0 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.badges.getAll({ limit, offset });
      return {
        badges: response.data.badges,
        totalCount: response.data.totalCount,
        hasMore: response.data.hasMore,
        offset
      };
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Mint badge
export const mintBadge = createAsyncThunk(
  'badges/mint',
  async ({ visitId, badgeType = 'location' }, { rejectWithValue }) => {
    try {
      const response = await api.badges.mint(visitId, badgeType);
      return response.data.badge;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Get badge by ID
export const getBadgeById = createAsyncThunk(
  'badges/getById',
  async (tokenId, { rejectWithValue }) => {
    try {
      const response = await api.badges.getById(tokenId);
      return response.data.badge;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Get badge by visit
export const getBadgeByVisit = createAsyncThunk(
  'badges/getByVisit',
  async (visitId, { rejectWithValue }) => {
    try {
      const response = await api.badges.getByVisit(visitId);
      return response.data.badge;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Transfer badge
export const transferBadge = createAsyncThunk(
  'badges/transfer',
  async ({ tokenId, toAddress }, { rejectWithValue }) => {
    try {
      const response = await api.badges.transfer(tokenId, toAddress);
      return { tokenId, toAddress, txHash: response.data.txHash };
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Get badge metadata
export const getBadgeMetadata = createAsyncThunk(
  'badges/getMetadata',
  async (tokenId, { rejectWithValue }) => {
    try {
      const response = await api.badges.getMetadata(tokenId);
      return { tokenId, metadata: response.data };
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Get collection statistics
export const getCollectionStats = createAsyncThunk(
  'badges/getCollectionStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.badges.getCollectionStats();
      return response.data.collection;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Verify badge
export const verifyBadge = createAsyncThunk(
  'badges/verify',
  async ({ tokenId, walletAddress }, { rejectWithValue }) => {
    try {
      const response = await api.badges.verify(tokenId, walletAddress);
      return { tokenId, verification: response.data };
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Get leaderboard
export const getLeaderboard = createAsyncThunk(
  'badges/getLeaderboard',
  async ({ limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.badges.getLeaderboard({ limit });
      return response.data.leaderboard;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Badge slice
const badgeSlice = createSlice({
  name: 'badges',
  initialState,
  reducers: {
    // Clear errors
    clearError: (state) => {
      state.error = null;
      state.mintError = null;
      state.transferError = null;
    },
    
    // Clear specific errors
    clearMintError: (state) => {
      state.mintError = null;
    },
    
    clearTransferError: (state) => {
      state.transferError = null;
    },
    
    // Set mint in progress
    setMintInProgress: (state, action) => {
      state.mintInProgress = action.payload;
    },
    
    // Clear mint in progress
    clearMintInProgress: (state) => {
      state.mintInProgress = null;
    },
    
    // Set current badge
    setCurrentBadge: (state, action) => {
      state.currentBadge = action.payload;
    },
    
    // Update badge metadata
    updateBadgeMetadata: (state, action) => {
      const { tokenId, metadata } = action.payload;
      const badge = state.badges.find(b => b.tokenId === tokenId);
      if (badge) {
        badge.metadata = metadata;
      }
    },
    
    // Set filters
    setFilterType: (state, action) => {
      state.filterType = action.payload;
    },
    
    setFilterRarity: (state, action) => {
      state.filterRarity = action.payload;
    },
    
    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },
    
    // Clear filters
    clearFilters: (state) => {
      state.filterType = 'all';
      state.filterRarity = 'all';
      state.sortBy = 'newest';
    },
    
    // Update badge ownership (after transfer)
    updateBadgeOwnership: (state, action) => {
      const { tokenId, newOwner } = action.payload;
      const badgeIndex = state.badges.findIndex(b => b.tokenId === tokenId);
      if (badgeIndex !== -1) {
        // Remove badge from current user's collection
        state.badges.splice(badgeIndex, 1);
        state.totalCount -= 1;
      }
    },
    
    // Reset badges state
    resetBadges: (state) => {
      Object.assign(state, initialState);
    }
  },
  extraReducers: (builder) => {
    // Get user badges
    builder
      .addCase(getUserBadges.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserBadges.fulfilled, (state, action) => {
        state.loading = false;
        const { badges, totalCount, hasMore, offset } = action.payload;
        
        if (offset === 0) {
          // First page - replace badges
          state.badges = badges;
        } else {
          // Subsequent pages - append badges
          state.badges.push(...badges);
        }
        
        state.totalCount = totalCount;
        state.hasMore = hasMore;
        state.currentPage = Math.floor(offset / 50);
        state.error = null;
      })
      .addCase(getUserBadges.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to load badges';
      });

    // Mint badge
    builder
      .addCase(mintBadge.pending, (state) => {
        state.mintLoading = true;
        state.mintError = null;
      })
      .addCase(mintBadge.fulfilled, (state, action) => {
        state.mintLoading = false;
        state.badges.unshift(action.payload); // Add to beginning
        state.totalCount += 1;
        state.currentBadge = action.payload;
        state.mintError = null;
        state.mintInProgress = null;
      })
      .addCase(mintBadge.rejected, (state, action) => {
        state.mintLoading = false;
        state.mintError = action.payload?.message || 'Failed to mint badge';
      });

    // Get badge by ID
    builder
      .addCase(getBadgeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBadgeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBadge = action.payload;
        state.error = null;
      })
      .addCase(getBadgeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to load badge';
      });

    // Get badge by visit
    builder
      .addCase(getBadgeByVisit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBadgeByVisit.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBadge = action.payload;
        state.error = null;
      })
      .addCase(getBadgeByVisit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'No badge found for this visit';
      });

    // Transfer badge
    builder
      .addCase(transferBadge.pending, (state) => {
        state.transferLoading = true;
        state.transferError = null;
      })
      .addCase(transferBadge.fulfilled, (state, action) => {
        state.transferLoading = false;
        const { tokenId } = action.payload;
        
        // Remove badge from user's collection
        const badgeIndex = state.badges.findIndex(b => b.tokenId === tokenId);
        if (badgeIndex !== -1) {
          state.badges.splice(badgeIndex, 1);
          state.totalCount -= 1;
        }
        
        state.transferError = null;
      })
      .addCase(transferBadge.rejected, (state, action) => {
        state.transferLoading = false;
        state.transferError = action.payload?.message || 'Failed to transfer badge';
      });

    // Get badge metadata
    builder
      .addCase(getBadgeMetadata.fulfilled, (state, action) => {
        const { tokenId, metadata } = action.payload;
        const badge = state.badges.find(b => b.tokenId === tokenId);
        if (badge) {
          badge.metadata = metadata;
        }
      });

    // Get collection statistics
    builder
      .addCase(getCollectionStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCollectionStats.fulfilled, (state, action) => {
        state.loading = false;
        state.collectionStats = action.payload;
      })
      .addCase(getCollectionStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to load collection stats';
      });

    // Get leaderboard
    builder
      .addCase(getLeaderboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(getLeaderboard.fulfilled, (state, action) => {
        state.loading = false;
        state.leaderboard = action.payload;
      })
      .addCase(getLeaderboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to load leaderboard';
      });
  }
});

// Export actions
export const {
  clearError,
  clearMintError,
  clearTransferError,
  setMintInProgress,
  clearMintInProgress,
  setCurrentBadge,
  updateBadgeMetadata,
  setFilterType,
  setFilterRarity,
  setSortBy,
  clearFilters,
  updateBadgeOwnership,
  resetBadges
} = badgeSlice.actions;

// Selectors
export const selectBadges = (state) => state.badges.badges;
export const selectCurrentBadge = (state) => state.badges.currentBadge;
export const selectBadgesLoading = (state) => state.badges.loading;
export const selectMintLoading = (state) => state.badges.mintLoading;
export const selectTransferLoading = (state) => state.badges.transferLoading;
export const selectBadgesError = (state) => state.badges.error;
export const selectMintError = (state) => state.badges.mintError;
export const selectTransferError = (state) => state.badges.transferError;
export const selectMintInProgress = (state) => state.badges.mintInProgress;
export const selectCollectionStats = (state) => state.badges.collectionStats;
export const selectLeaderboard = (state) => state.badges.leaderboard;
export const selectBadgeFilters = (state) => ({
  filterType: state.badges.filterType,
  filterRarity: state.badges.filterRarity,
  sortBy: state.badges.sortBy
});
export const selectBadgesPagination = (state) => ({
  totalCount: state.badges.totalCount,
  hasMore: state.badges.hasMore,
  currentPage: state.badges.currentPage
});

// Computed selectors
export const selectFilteredBadges = (state) => {
  const badges = selectBadges(state);
  const filters = selectBadgeFilters(state);
  
  let filtered = badges;
  
  // Filter by type
  if (filters.filterType !== 'all') {
    filtered = filtered.filter(badge => badge.badgeType === filters.filterType);
  }
  
  // Filter by rarity
  if (filters.filterRarity !== 'all') {
    filtered = filtered.filter(badge => badge.rarity === filters.filterRarity);
  }
  
  // Sort badges
  switch (filters.sortBy) {
    case 'oldest':
      return [...filtered].sort((a, b) => new Date(a.mintedAt) - new Date(b.mintedAt));
    case 'rarity':
      const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
      return [...filtered].sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
    case 'type':
      return [...filtered].sort((a, b) => a.badgeType.localeCompare(b.badgeType));
    case 'newest':
    default:
      return [...filtered].sort((a, b) => new Date(b.mintedAt) - new Date(a.mintedAt));
  }
};

export default badgeSlice.reducer;