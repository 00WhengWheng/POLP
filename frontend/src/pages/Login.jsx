import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import { loginUser } from '../features/user/userSlice';
import Loader from '../components/Loader';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { connect, isConnected, walletAddress, signMessage } = useWallet();
  const { isLoading, error } = useSelector(state => state.user);
  
  const [loginStep, setLoginStep] = useState('connect'); // connect, sign, complete
  const [connectError, setConnectError] = useState(null);

  useEffect(() => {
    if (isConnected && loginStep === 'connect') {
      setLoginStep('sign');
      handleSignAndLogin();
    }
  }, [isConnected, loginStep]);

  const handleConnect = async () => {
    try {
      setConnectError(null);
      await connect();
    } catch (error) {
      setConnectError(error.message);
    }
  };

  const handleSignAndLogin = async () => {
    try {
      const message = `Welcome to POGPP!\n\nSign this message to authenticate your wallet.\n\nNonce: ${Date.now()}`;
      const signature = await signMessage(message);
      
      const userInfo = {
        walletAddress,
        loginTime: new Date().toISOString()
      };

      const resultAction = await dispatch(loginUser({
        walletAddress,
        signature,
        message,
        userInfo
      }));

      if (loginUser.fulfilled.match(resultAction)) {
        setLoginStep('complete');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error) {
      setConnectError(error.message);
      setLoginStep('connect');
    }
  };

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-4 4-4-4L6 10.257A6 6 0 1118 8zm-6-2a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
        </svg>
      ),
      title: 'Instant Wallet Creation',
      description: 'Create a wallet in seconds with Web3Auth - no extensions needed'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      ),
      title: 'Secure Authentication',
      description: 'Your keys, your control - secured by Web3Auth infrastructure'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm10-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1h8V5zM4 15V9h12v6H4z" clipRule="evenodd" />
        </svg>
      ),
      title: 'Start Earning Badges',
      description: 'Begin your journey and earn NFT badges for verified locations'
    }
  ];

  const getStepContent = () => {
    switch (loginStep) {
      case 'sign':
        return {
          title: 'Sign Authentication Message',
          description: 'Please sign the message in your wallet to complete authentication',
          loading: true
        };
      case 'complete':
        return {
          title: 'Welcome to POGPP!',
          description: 'Authentication successful. Redirecting to your dashboard...',
          loading: true
        };
      default:
        return {
          title: 'Connect Your Wallet',
          description: 'Connect with Web3Auth to start verifying your location',
          loading: false
        };
    }
  };

  const stepContent = getStepContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Login Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="text-center lg:text-left">
              <Link to="/" className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors mb-8">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Back to Home</span>
              </Link>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {stepContent.title}
              </h1>
              <p className="text-lg text-gray-600">
                {stepContent.description}
              </p>
            </div>

            {/* Login Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
              {loginStep === 'connect' && (
                <>
                  <button
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {isLoading ? (
                      <Loader size="small" color="white" />
                    ) : (
                      <>
                        <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-4 4-4-4L6 10.257A6 6 0 1118 8zm-6-2a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                        </svg>
                        Connect with Web3Auth
                      </>
                    )}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">
                        Secure • Fast • Decentralized
                      </span>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      New to crypto? No problem!
                    </p>
                    <p className="text-xs text-gray-500">
                      Web3Auth creates a wallet for you instantly using your existing accounts
                    </p>
                  </div>
                </>
              )}

              {(loginStep === 'sign' || loginStep === 'complete') && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    {loginStep === 'complete' ? (
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <Loader size="medium" color="white" />
                    )}
                  </div>
                  
                  {stepContent.loading && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        {loginStep === 'sign' ? 'Please check your wallet...' : 'Setting up your account...'}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: loginStep === 'complete' ? '100%' : '60%' }}
                          transition={{ duration: 1.5 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {(error || connectError) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-700 text-sm">
                      {error || connectError}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Wallet Address Display */}
              {isConnected && walletAddress && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-green-700 text-sm font-medium">Wallet Connected</p>
                      <p className="text-green-600 text-xs font-mono">{walletAddress}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Column - Features */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Why Choose POGPP?
              </h2>
              <p className="text-gray-600">
                Join the future of location verification with blockchain technology
              </p>
            </div>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  className="flex items-start space-x-4 p-4 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white text-center"
            >
              <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
              <p className="text-blue-100 text-sm">
                Connect your wallet and start earning NFT badges for verified locations
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
