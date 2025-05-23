import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { useNFC } from '../hooks/useNFC';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWallet } from '../hooks/useWallet';
import { startVisit, setNFCData, setGPSData, submitVisit } from '../features/visits/visitSlice';
import Loader from './Loader';

const VisitButton = ({ onVisitComplete, disabled = false, className = '' }) => {
  const dispatch = useDispatch();
  const { isConnected } = useWallet();
  const { visitInProgress, isSubmitting } = useSelector(state => state.visits);
  
  const [visitState, setVisitState] = useState('idle'); // idle, nfc, gps, submitting, complete, error
  const [error, setError] = useState(null);
  
  const { scanNFC, isSupported: nfcSupported, isScanning: nfcScanning } = useNFC({
    onSuccess: (nfcData) => {
      dispatch(setNFCData(nfcData));
      setVisitState('gps');
      getCurrentLocation();
    },
    onError: (error) => {
      setError(`NFC Error: ${error.message}`);
      setVisitState('error');
    }
  });

  const { getCurrentLocation, isGettingLocation } = useGeolocation({
    onSuccess: (gpsData) => {
      dispatch(setGPSData(gpsData));
      setVisitState('submitting');
      handleSubmitVisit();
    },
    onError: (error) => {
      setError(`GPS Error: ${error.message}`);
      setVisitState('error');
    }
  });

  const handleStartVisit = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setVisitState('nfc');
    dispatch(startVisit());
    
    try {
      await scanNFC();
    } catch (error) {
      setError(`Failed to scan NFC: ${error.message}`);
      setVisitState('error');
    }
  };

  const handleSubmitVisit = async () => {
    try {
      const resultAction = await dispatch(submitVisit());
      
      if (submitVisit.fulfilled.match(resultAction)) {
        setVisitState('complete');
        setTimeout(() => {
          setVisitState('idle');
          onVisitComplete && onVisitComplete(resultAction.payload);
        }, 2000);
      } else {
        throw new Error(resultAction.payload?.message || 'Visit submission failed');
      }
    } catch (error) {
      setError(`Submission Error: ${error.message}`);
      setVisitState('error');
    }
  };

  const handleRetry = () => {
    setError(null);
    setVisitState('idle');
  };

  const getButtonContent = () => {
    switch (visitState) {
      case 'nfc':
        return {
          text: 'Tap NFC Tag',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
          ),
          loading: nfcScanning,
          pulse: true
        };
      
      case 'gps':
        return {
          text: 'Getting Location',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          ),
          loading: isGettingLocation,
          pulse: false
        };
      
      case 'submitting':
        return {
          text: 'Submitting Visit',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ),
          loading: isSubmitting,
          pulse: false
        };
      
      case 'complete':
        return {
          text: 'Visit Complete!',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ),
          loading: false,
          pulse: false
        };
      
      case 'error':
        return {
          text: 'Retry Visit',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          ),
          loading: false,
          pulse: false
        };
      
      default:
        return {
          text: 'Start Visit',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          ),
          loading: false,
          pulse: false
        };
    }
  };

  const buttonContent = getButtonContent();
  const isLoading = buttonContent.loading;
  const isDisabled = disabled || isLoading || !isConnected;

  const getButtonColor = () => {
    switch (visitState) {
      case 'complete':
        return 'bg-green-500 hover:bg-green-600 border-green-500';
      case 'error':
        return 'bg-red-500 hover:bg-red-600 border-red-500';
      case 'nfc':
      case 'gps':
      case 'submitting':
        return 'bg-blue-500 hover:bg-blue-600 border-blue-500';
      default:
        return isConnected 
          ? 'bg-blue-500 hover:bg-blue-600 border-blue-500'
          : 'bg-gray-400 border-gray-400 cursor-not-allowed';
    }
  };

  useEffect(() => {
    if (!nfcSupported && visitState === 'idle') {
      setError('NFC is not supported on this device');
    }
  }, [nfcSupported, visitState]);

  return (
    <div className={`space-y-4 ${className}`}>
      <motion.button
        onClick={visitState === 'error' ? handleRetry : handleStartVisit}
        disabled={isDisabled}
        className={`
          relative w-full py-4 px-6 rounded-xl font-semibold text-white
          border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50
          ${getButtonColor()} ${buttonContent.pulse ? 'animate-pulse' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105 active:scale-95'}
        `}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
      >
        <div className="flex items-center justify-center space-x-3">
          {isLoading ? (
            <Loader size="small" color="white" />
          ) : (
            <motion.div
              animate={buttonContent.pulse ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {buttonContent.icon}
            </motion.div>
          )}
          <span className="text-lg">{buttonContent.text}</span>
        </div>
      </motion.button>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Connection Warning */}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-yellow-700 text-sm">Please connect your wallet to start a visit</p>
          </div>
        </motion.div>
      )}

      {/* Visit Progress */}
      {visitInProgress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <h4 className="font-medium text-blue-900 mb-2">Visit Progress</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">NFC Tag</span>
              <div className="flex items-center space-x-1">
                {visitInProgress.nfcTagId ? (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-green-600">Scanned</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">Pending</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">GPS Location</span>
              <div className="flex items-center space-x-1">
                {visitInProgress.coordinates ? (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-green-600">Captured</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">Pending</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default VisitButton;
