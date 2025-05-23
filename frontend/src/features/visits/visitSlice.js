import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/apiClient';

// Initial state
const initialState = {
  // Visit data
  visits: [],
  currentVisit: null,
  recentVisits: [],
  
  // Pagination
  totalCount: 0,
  hasMore: false,
  currentPage: 0,
  
  // Loading states
  loading: false,
  createLoading: false,
  validateLoading: false,
  
  // Error states
  error: null,
  createError: null,
  validateError: null,
  
  // Visit creation flow
  visitInProgress: null,
  nfcData: null,
  gpsData: null,
  
  // Search and filters
  searchQuery: '',
  locationFilter: '',
  semanticSearchResults: [],
  
  // User statistics
  userStats: {
    totalVisits: 0,
    verifiedVisits: 0,
    uniqueLocations: 0,
    recentVisits: 0
  }
};

// Async thunks

// Create visit
export const createVisit = createAsyncThunk(
  'visits/create',
  async (visitData, { rejectWithValue }) => {
    try {
      const response = await api.visits.create(visitData);
      return response.data.visit;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Get user visits
export const getUserVisits = createAsyncThunk(
  'visits/getAll',
  async ({ limit = 50, offset = 0, locationName = '' } = {}, { rejectWithValue }) => {
    try {
      const params = { limit, offset };
      if (locationName) params.locationName = locationName;
      
      const response = await api.visits.getAll(params);
      return {
        visits: response.data.visits,
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

// Get visit by ID
export const getVisitById = createAsyncThunk(
  'visits/getById',
  async (visitId, { rejectWithValue }) => {
    try {
      const response = await api.visits.getById(visitId);
      return response.data.visit;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Validate visit data
export const validateVisit = createAsyncThunk(
  'visits/validate',
  async (visitData, { rejectWithValue }) => {
    try {
      const response = await api.visits.validate(visitData);
      return response.data;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Verify visit for NFT
export const verifyVisitForNFT = createAsyncThunk(
  'visits/verifyForNFT',
  async (visitId, { rejectWithValue }) => {
    try {
      const response = await api.visits.verifyForNFT(visitId);
      return { visitId, verificationData: response.data };
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Get user visit statistics
export const getUserVisitStats = createAsyncThunk(
  'visits/getUserStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.visits.getUserStats();
      return response.data.stats;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Semantic search visits
export const semanticSearchVisits = createAsyncThunk(
  'visits/semanticSearch',
  async ({ query, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await api.visits.semanticSearch(query, limit);
      return {
        query,
        results: response.data.results
      };
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Get visits by location
export const getVisitsByLocation = createAsyncThunk(
  'visits/getByLocation',
  async ({ locationId, limit = 20, offset = 0 }, { rejectWithValue }) => {
    try {
      const response = await api.visits.getByLocation(locationId, { limit, offset });
      return response.data;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Visit slice
const visitSlice = createSlice({
  name: 'visits',
  initialState,
  reducers: {
    // Clear errors
    clearError: (state) => {
      state.error = null;
      state.createError = null;
      state.validateError = null;
    },
    
    // Clear specific errors
    clearCreateError: (state) => {
      state.createError = null;
    },
    
    clearValidateError: (state) => {
      state.validateError = null;
    },
    
    // Set visit in progress
    setVisitInProgress: (state, action) => {
      state.visitInProgress = action.payload;
    },
    
    // Set NFC data
    setNFCData: (state, action) => {
      state.nfcData = action.payload;
      if (state.visitInProgress) {
        state.visitInProgress.nfcTagId = action.payload.tagId;
      }
    },
    
    // Set GPS data
    setGPSData: (state, action) => {
      state.gpsData = action.payload;
      if (state.visitInProgress) {
        state.visitInProgress.latitude = action.payload.latitude;
        state.visitInProgress.longitude = action.payload.longitude;
        state.visitInProgress.accuracy = action.payload.accuracy;
      }
    },
    
    // Update visit in progress
    updateVisitInProgress: (state, action) => {
      if (state.visitInProgress) {
        state.visitInProgress = { ...state.visitInProgress, ...action.payload };
      }
    },
    
    // Clear visit in progress
    clearVisitInProgress: (state) => {
      state.visitInProgress = null;
      state.nfcData = null;
      state.gpsData = null;
    },
    
    // Set search query
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    
    // Set location filter
    setLocationFilter: (state, action) => {
      state.locationFilter = action.payload;
    },
    
    // Clear semantic search results
    clearSemanticSearchResults: (state) => {
      state.semanticSearchResults = [];
    },
    
    // Update visit status
    updateVisitStatus: (state, action) => {
      const { visitId, status, verifiedAt } = action.payload;
      const visit = state.visits.find(v => v.id === visitId);
      if (visit) {
        visit.isVerified = status === 'verified';
        if (verifiedAt) visit.verifiedAt = verifiedAt;
      }
    },
    
    // Reset visits state
    resetVisits: (state) => {
      Object.assign(state, initialState);
    }
  },
  extraReducers: (builder) => {
    // Create visit
    builder
      .addCase(createVisit.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createVisit.fulfilled, (state, action) => {
        state.createLoading = false;
        state.visits.unshift(action.payload); // Add to beginning
        state.currentVisit = action.payload;
        state.createError = null;
        // Clear visit in progress
        state.visitInProgress = null;
        state.nfcData = null;
        state.gpsData = null;
      })
      .addCase(createVisit.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload?.message || 'Failed to create visit';
      });

    // Get user visits
    builder
      .addCase(getUserVisits.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserVisits.fulfilled, (state, action) => {
        state.loading = false;
        const { visits, totalCount, hasMore, offset } = action.payload;
        
        if (offset === 0) {
          // First page - replace visits
          state.visits = visits;
        } else {
          // Subsequent pages - append visits
          state.visits.push(...visits);
        }
        
        state.totalCount = totalCount;
        state.hasMore = hasMore;
        state.currentPage = Math.floor(offset / 50);
        state.error = null;
      })
      .addCase(getUserVisits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to load visits';
      });

    // Get visit by ID
    builder
      .addCase(getVisitById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVisitById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVisit = action.payload;
        state.error = null;
      })
      .addCase(getVisitById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to load visit';
      });

    // Validate visit
    builder
      .addCase(validateVisit.pending, (state) => {
        state.validateLoading = true;
        state.validateError = null;
      })
      .addCase(validateVisit.fulfilled, (state, action) => {
        state.validateLoading = false;
        state.validateError = null;
        // Store validation result if needed
      })
      .addCase(validateVisit.rejected, (state, action) => {
        state.validateLoading = false;
        state.validateError = action.payload?.message || 'Visit validation failed';
      });

    // Verify visit for NFT
    builder
      .addCase(verifyVisitForNFT.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyVisitForNFT.fulfilled, (state, action) => {
        state.loading = false;
        const { visitId } = action.payload;
        
        // Update visit status
        const visit = state.visits.find(v => v.id === visitId);
        if (visit) {
          visit.isVerified = true;
          visit.verifiedAt = new Date().toISOString();
        }
        
        state.error = null;
      })
      .addCase(verifyVisitForNFT.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Visit verification failed';
      });

    // Get user visit statistics
    builder
      .addCase(getUserVisitStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserVisitStats.fulfilled, (state, action) => {
        state.loading = false;
        state.userStats = action.payload;
      })
      .addCase(getUserVisitStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to load statistics';
      });

    // Semantic search visits
    builder
      .addCase(semanticSearchVisits.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(semanticSearchVisits.fulfilled, (state, action) => {
        state.loading = false;
        state.semanticSearchResults = action.payload.results;
        state.searchQuery = action.payload.query;
        state.error = null;
      })
      .addCase(semanticSearchVisits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Search failed';
      });
  }
});

// Export actions
export const {
  clearError,
  clearCreateError,
  clearValidateError,
  setVisitInProgress,
  setNFCData,
  setGPSData,
  updateVisitInProgress,
  clearVisitInProgress,
  setSearchQuery,
  setLocationFilter,
  clearSemanticSearchResults,
  updateVisitStatus,
  resetVisits
} = visitSlice.actions;

// Selectors
export const selectVisits = (state) => state.visits.visits;
export const selectCurrentVisit = (state) => state.visits.currentVisit;
export const selectVisitsLoading = (state) => state.visits.loading;
export const selectCreateLoading = (state) => state.visits.createLoading;
export const selectVisitsError = (state) => state.visits.error;
export const selectCreateError = (state) => state.visits.createError;
export const selectVisitInProgress = (state) => state.visits.visitInProgress;
export const selectNFCData = (state) => state.visits.nfcData;
export const selectGPSData = (state) => state.visits.gpsData;
export const selectUserVisitStats = (state) => state.visits.userStats;
export const selectSemanticSearchResults = (state) => state.visits.semanticSearchResults;
export const selectVisitsPagination = (state) => ({
  totalCount: state.visits.totalCount,
  hasMore: state.visits.hasMore,
  currentPage: state.visits.currentPage
});

export default visitSlice.reducer;