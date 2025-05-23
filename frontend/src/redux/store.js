import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import reducers
import userReducer from '../features/user/userSlice';
import visitReducer from '../features/visits/visitSlice';
import badgeReducer from '../features/badges/badgeSlice';

// Redux persist configuration
const persistConfig = {
  key: 'pogpp-root',
  storage,
  whitelist: ['user'], // Only persist user state
  blacklist: ['visits', 'badges'] // Don't persist visits and badges (fresh data on each session)
};

// User-specific persist config
const userPersistConfig = {
  key: 'pogpp-user',
  storage,
  whitelist: ['walletAddress', 'username', 'isAuthenticated', 'profile']
};

// Root reducer
const rootReducer = combineReducers({
  user: persistReducer(userPersistConfig, userReducer),
  visits: visitReducer,
  badges: badgeReducer
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['register', 'rehydrate']
      }
    }),
  devTools: process.env.NODE_ENV !== 'production'
});

// Persistor
export const persistor = persistStore(store);

// Types for TypeScript (if needed later)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;