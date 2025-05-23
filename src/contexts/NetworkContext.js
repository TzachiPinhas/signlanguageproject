import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

// Create the context
const NetworkContext = createContext({
  online: true,
  connectionType: '',
  connectionQuality: 'good',
  lastChecked: null,
  checkConnection: () => {},
});

/**
 * Network status provider component
 * Monitors network connectivity and provides network status information
 * to its child components through React Context
 */
export const NetworkProvider = ({ children }) => {
  // Network status state
  const [networkState, setNetworkState] = useState({
    online: navigator.onLine,
    connectionType: '',
    connectionQuality: 'good',
    lastChecked: new Date(),
  });
  
  // Function to actively check connection status
  const checkConnection = useCallback(async () => {
    // Update online status first
    const isOnline = navigator.onLine;
    
    // If browser reports offline, no need for further checks
    if (!isOnline) {
      setNetworkState(prev => ({
        ...prev,
        online: false,
        connectionQuality: 'offline',
        lastChecked: new Date(),
      }));
      return false;
    }
    
    try {
      // Try to determine connection type using Network Information API
      let connectionType = 'unknown';
      let effectiveType = 'unknown';
      
      // Check if Network Information API is available
      if ('connection' in navigator) {
        const connection = navigator.connection;
        connectionType = connection.type || 'unknown';
        effectiveType = connection.effectiveType || 'unknown';
      }
      
      // Perform a real connection test by loading a tiny resource
      const startTime = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      try {
        // Try to fetch a minimal resource to confirm connectivity
        // Using a timestamp to bypass cache
        const response = await fetch(
          'https://signlanguagewebapp-a5eff0dabmhwfphu.westeurope-01.azurewebsites.net/api/health',
          { 
            method: 'HEAD',
            cache: 'no-store',
            signal: controller.signal
          }
        );
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        
        // Calculate response time to determine quality
        const responseTime = performance.now() - startTime;
        let connectionQuality = 'good';
        
        // Determine quality based on response time and effective connection type
        if (responseTime > 1000 || effectiveType === 'slow-2g' || effectiveType === '2g') {
          connectionQuality = 'poor';
        } else if (responseTime > 300 || effectiveType === '3g') {
          connectionQuality = 'moderate';
        }
        
        // Update the network state
        setNetworkState({
          online: true,
          connectionType: connectionType,
          connectionQuality,
          lastChecked: new Date(),
        });
        
        return true;
      } catch (fetchError) {
        clearTimeout(timeout);
        console.warn('Network check failed:', fetchError);
        
        // Still online according to browser, but API request failed
        setNetworkState({
          online: true, // Browser still reports online
          connectionType: connectionType,
          connectionQuality: 'poor', // But quality is poor since request failed
          lastChecked: new Date(),
        });
        
        return false;
      }
    } catch (error) {
      console.error('Error checking network connection:', error);
      
      setNetworkState(prev => ({
        ...prev,
        connectionQuality: 'unknown',
        lastChecked: new Date(),
      }));
      
      return false;
    }
  }, []);
  
  // Check connection when online status changes
  useEffect(() => {
    const handleOnline = () => {
      setNetworkState(prev => ({ ...prev, online: true }));
      checkConnection();
    };
    
    const handleOffline = () => {
      setNetworkState(prev => ({
        ...prev,
        online: false,
        connectionQuality: 'offline',
        lastChecked: new Date(),
      }));
    };
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial connection check
    checkConnection();
    
    // Set up periodic checking if needed
    const intervalId = setInterval(checkConnection, 60000); // Every minute
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [checkConnection]);
  
  // Monitor connection changes if Network Information API is available
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const handleConnectionChange = () => {
        checkConnection();
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        connection.removeEventListener('change', handleConnectionChange);
      };
    }
  }, [checkConnection]);
  
  return (
    <NetworkContext.Provider
      value={{
        ...networkState,
        checkConnection,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

/**
 * Custom hook to access network status information
 * @returns {Object} Network status object
 */
export const useNetworkStatus = () => useContext(NetworkContext);

export default NetworkProvider;
