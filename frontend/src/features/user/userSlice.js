import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/apiClient';

// Initial state
const initialState = {
  // Authentication
  isAuthenticated: false,
  walletAddress: null,
  username: null,
  profile: null,
  
  // Loading states
  loading: false,
  loginLoading: false,
  profileLoading: false,
  
  // Error states
  error: null,
  loginError: null,
  profileError: null,
  
  // User stats
  stats: {
    totalVisits: 0,
    totalBadges: 0,
    reputationScore: 0
  },
  
  // UI state
  isWalletConnecting: false,
  lastLoginAt: null
};

// Async thunks

// Login user
export const loginUser = createAsyncThunk(
  'user/login',
  async ({ walletAddress, signature, message, userInfo }, { rejectWithValue }) => {
    try {
      const response = await api.auth.login(walletAddress, signature, message, userInfo);
      
      // Set token in API client
      api.utils.setAuthToken(response.data.token);
      
      return {
        user: response.data.user,
        token: response.data.token
      };
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Register user
export const registerUser = createAsyncThunk(
  'user/register',
  async ({ walletAddress, signature, message, username, userInfo }, { rejectWithValue }) => {
    try {
      const response = await api.auth.register(walletAddress, signature, message, username, userInfo);
      
      // Set token in API client
      api.utils.setAuthToken(response.data.token);
      
      return {
        user: response.data.user,
        token: response.data.token
      };
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Get user profile
export const getUserProfile = createAsyncThunk(
  'user/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.auth.getProfile();
      return response.data.user;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Update user profile
export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async ({ username }, { rejectWithValue }) => {
    try {
      const response = await api.auth.updateProfile(username);
      return response.data.user;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Refresh token
export const refreshToken = createAsyncThunk(
  'user/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.auth.refreshToken();
      
      // Update token in API client
      api.utils.setAuthToken(response.data.token);
      
      return response.data.token;
    } catch (error) {
      const errorData = api.utils.handleError(error);
      return rejectWithValue(errorData);
    }
  }
);

// Logout user
export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.auth.logout();
      
      // Clear token from API client
      api.utils.setAuthToken(null);
      
      return true;
    } catch (error) {
      // Even if logout fails on backend, clear local state
      api.utils.setAuthToken(null);
      return true;
    }
  }
);

// User slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Clear errors
    clearError: (state) => {
      state.error = null;
      state.loginError = null;
      state.profileError = null;
    },
    
    // Clear login error specifically
    clearLoginError: (state) => {
      state.loginError = null;
    },
    
    // Set wallet connecting state
    setWalletConnecting: (state, action) => {
      state.isWalletConnecting = action.payload;
    },
    
    // Update user stats
    updateStats: (state, action) => {
      state.stats = { ...state.stats, ...action.payload };
    },
    
    // Set authentication state (for wallet connection without backend)
    setAuthState: (state, action) => {
      const { walletAddress, isAuthenticated } = action.payload;
      state.walletAddress = walletAddress;
      state.isAuthenticated = isAuthenticated;
    },
    
    // Reset user state
    resetUser: (state) => {
      Object.assign(state, initialState);
    }
  },
  extraReducers: (builder) => {
    // Login user
    builder
      .addCase(loginUser.pending, (state) => {
        state.loginLoading = true;
        state.loginError = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loginLoading = false;
        state.isAuthenticated = true;
        state.walletAddress = action.payload.user.walletAddress;
        state.username = action.payload.user.username;
        state.profile = action.payload.user;
        state.lastLoginAt = new Date().toISOString();
        state.loginError = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loginLoading = false;
        state.loginError = action.payload?.message || 'Login failed';
        state.isAuthenticated = false;
      });

    // Register user
    builder
      .addCase(registerUser.pending, (state) => {
        state.loginLoading = true;
        state.loginError = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loginLoading = false;
        state.isAuthenticated = true;
        state.walletAddress = action.payload.user.walletAddress;
        state.username = action.payload.user.username;
        state.profile = action.payload.user;
        state.lastLoginAt = new Date().toISOString();
        state.loginError = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loginLoading = false;
        state.loginError = action.payload?.message || 'Registration failed';
        state.isAuthenticated = false;
      });

    // Get user profile
    builder
      .addCase(getUserProfile.pending, (state) => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
        state.walletAddress = action.payload.walletAddress;
        state.username = action.payload.username;
        state.profileError = null;
      })
      .addCase(getUserProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload?.message || 'Failed to load profile';
      });

    // Update user profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
        state.username = action.payload.username;
        state.profileError = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload?.message || 'Failed to update profile';
      });

    // Refresh token
    builder
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshToken.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Token refresh failed';
        // If token refresh fails, logout user
        state.isAuthenticated = false;
        state.walletAddress = null;
        state.username = null;
        state.profile = null;
      });

    // Logout user
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        // Reset to initial state
        Object.assign(state, initialState);
      })
      .addCase(logoutUser.rejected, (state) => {
        // Even if logout fails, reset state
        Object.assign(state, initialState);
      });
  }
});

// Export actions
export const {
  clearError,
  clearLoginError,
  setWalletConnecting,
  updateStats,
  setAuthState,
  resetUser
} = userSlice.actions;

// Selectors
export const selectUser = (state) => state.user;
export const selectIsAuthenticated = (state) => state.user.isAuthenticated;
export const selectWalletAddress = (state) => state.user.walletAddress;
export const selectUsername = (state) => state.user.username;
export const selectUserProfile = (state) => state.user.profile;
export const selectUserStats = (state) => state.user.stats;
export const selectUserLoading = (state) => state.user.loginLoading || state.user.loading;
export const selectUserError = (state) => state.user.error || state.user.loginError;

export default userSlice.reducer;