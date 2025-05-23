import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Web3Auth } from '@web3auth/modal';
import { CHAIN_NAMESPACES } from '@web3auth/base';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';

const useWallet = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading } = useSelector(state => state.user);
  
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Web3Auth configuration
  const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x64", // Gnosis Chain
    rpcTarget: process.env.REACT_APP_GNOSIS_RPC_URL || "https://rpc.gnosischain.com",
    displayName: "Gnosis Chain",
    blockExplorer: "https://gnosisscan.io",
    ticker: "XDAI",
    tickerName: "xDAI",
  };

  // Initialize Web3Auth
  useEffect(() => {
    const initWeb3Auth = async () => {
      try {
        const privateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig }
        });

        const web3AuthInstance = new Web3Auth({
          clientId: process.env.REACT_APP_WEB3AUTH_CLIENT_ID,
          web3AuthNetwork: process.env.REACT_APP_WEB3AUTH_NETWORK || "sapphire_devnet",
          privateKeyProvider,
          uiConfig: {
            theme: "light",
            loginMethodsOrder: ["google", "github", "twitter"],
            appName: "POGPP",
            appLogo: "/logo.svg",
          }
        });

        await web3AuthInstance.initModal();
        setWeb3auth(web3AuthInstance);
        setIsInitialized(true);

        // Check if user is already logged in
        if (web3AuthInstance.connected) {
          setProvider(web3AuthInstance.provider);
        }

      } catch (error) {
        console.error("Web3Auth initialization failed:", error);
        setError(error.message);
      }
    };

    initWeb3Auth();
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!web3auth) {
      setError("Web3Auth not initialized");
      return;
    }

    try {
      setError(null);
      const web3authProvider = await web3auth.connect();
      setProvider(web3authProvider);

      // Get user info
      const userInfo = await web3auth.getUserInfo();
      const accounts = await web3authProvider.request({ method: "eth_accounts" });
      
      return {
        provider: web3authProvider,
        userInfo,
        walletAddress: accounts[0]
      };

    } catch (error) {
      console.error("Wallet connection failed:", error);
      setError(error.message);
      throw error;
    }
  }, [web3auth]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (!web3auth) return;

    try {
      await web3auth.logout();
      setProvider(null);
      dispatch({ type: 'user/logout' });
    } catch (error) {
      console.error("Wallet disconnection failed:", error);
      setError(error.message);
    }
  }, [web3auth, dispatch]);

  // Sign message
  const signMessage = useCallback(async (message) => {
    if (!provider) {
      throw new Error("Wallet not connected");
    }

    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, accounts[0]]
      });

      return signature;
    } catch (error) {
      console.error("Message signing failed:", error);
      throw error;
    }
  }, [provider]);

  // Get wallet address
  const getAddress = useCallback(async () => {
    if (!provider) return null;

    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      return accounts[0];
    } catch (error) {
      console.error("Failed to get wallet address:", error);
      return null;
    }
  }, [provider]);

  // Get balance
  const getBalance = useCallback(async () => {
    if (!provider) return null;

    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      const balance = await provider.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"]
      });

      // Convert from wei to ether
      return (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
    } catch (error) {
      console.error("Failed to get balance:", error);
      return null;
    }
  }, [provider]);

  // Send transaction
  const sendTransaction = useCallback(async (transactionConfig) => {
    if (!provider) {
      throw new Error("Wallet not connected");
    }

    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: accounts[0],
          ...transactionConfig
        }]
      });

      return txHash;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  }, [provider]);

  // Switch to Gnosis Chain
  const switchToGnosis = useCallback(async () => {
    if (!provider) return;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x64' }], // Gnosis Chain ID
      });
    } catch (switchError) {
      // Chain not added, try to add it
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x64',
              chainName: 'Gnosis Chain',
              nativeCurrency: {
                name: 'xDAI',
                symbol: 'XDAI',
                decimals: 18,
              },
              rpcUrls: ['https://rpc.gnosischain.com'],
              blockExplorerUrls: ['https://gnosisscan.io'],
            }],
          });
        } catch (addError) {
          console.error("Failed to add Gnosis Chain:", addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  }, [provider]);

  // Authentication flow
  const authenticate = useCallback(async () => {
    try {
      const connectionResult = await connect();
      
      // Generate challenge message
      const message = `POGPP Authentication Challenge\n\nWallet: ${connectionResult.walletAddress}\nTimestamp: ${Date.now()}\nNonce: ${Math.random().toString(36).substring(7)}`;
      
      // Sign the message
      const signature = await signMessage(message);
      
      // Send to backend for authentication
      const authData = {
        walletAddress: connectionResult.walletAddress,
        signature: signature,
        message: message,
        userInfo: connectionResult.userInfo
      };

      return authData;

    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
  }, [connect, signMessage]);

  return {
    // State
    isInitialized,
    isConnected: !!provider,
    isAuthenticated,
    user,
    loading,
    error,
    provider,

    // Actions
    connect,
    disconnect,
    authenticate,
    signMessage,
    getAddress,
    getBalance,
    sendTransaction,
    switchToGnosis,

    // Utils
    web3auth
  };
};

export default useWallet;