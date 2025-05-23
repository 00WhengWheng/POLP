import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'react-hot-toast';
import { store, persistor } from './redux/store';
import AppRoutes from './routes/AppRoutes';
import Navbar from './components/Navbar';
import Loader from './components/Loader';
import { useWallet } from './hooks/useWallet';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuthStatus } from './features/user/userSlice';

const AppContent = () => {
  const dispatch = useDispatch();
  const { isConnected, walletAddress, isInitializing } = useWallet();
  const { isAuthenticated, isLoading } = useSelector(state => state.user);

  useEffect(() => {
    if (isConnected && walletAddress && !isAuthenticated) {
      dispatch(checkAuthStatus());
    }
  }, [isConnected, walletAddress, isAuthenticated, dispatch]);

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader size="large" />
          <p className="text-gray-600 mt-4">Loading POGPP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        <AppRoutes />
      </main>
      
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </div>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader size="large" />
            <p className="text-gray-600 mt-4">Initializing...</p>
          </div>
        </div>
      } persistor={persistor}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  );
};

export default App;
