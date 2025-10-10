// BunkerWatch Online Status Hook
import { useState, useEffect } from 'react';

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      console.log('✓ Connection restored');
    }
    
    function handleOffline() {
      setIsOnline(false);
      console.log('✗ Connection lost - working offline');
    }
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Also periodically check connection
    const interval = setInterval(() => {
      setIsOnline(navigator.onLine);
    }, 30000); // Every 30 seconds
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);
  
  return isOnline;
}

export default useOnlineStatus;

