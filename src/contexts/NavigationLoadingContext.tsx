import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface NavigationLoadingContextType {
  isLoading: boolean;
  startLoading: (screenName?: string) => void;
  stopLoading: () => void;
  markScreenReady: (screenName: string) => void;
  isScreenVisited: (screenName: string) => boolean;
  forceStopLoading: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
  markScreenReady: () => {},
  isScreenVisited: () => false,
  forceStopLoading: () => {},
});

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

interface NavigationLoadingProviderProps {
  children: React.ReactNode;
}

export const NavigationLoadingProvider: React.FC<NavigationLoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const visitedScreens = useRef<Set<string>>(new Set(['TabHome', 'Home', 'Dashboard'])); // Pre-mark home as visited
  const loadingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingDelayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);
  const loadingStartTime = useRef<number>(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
      if (loadingDelayTimeout.current) clearTimeout(loadingDelayTimeout.current);
    };
  }, []);

  const startLoading = useCallback((screenName?: string) => {
    if (!isMounted.current) return;
    
    // Don't show loading for already visited screens
    if (screenName && visitedScreens.current.has(screenName)) {
      return;
    }
    
    // Clear any existing timeouts
    if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    if (loadingDelayTimeout.current) clearTimeout(loadingDelayTimeout.current);

    // Only show loading if it takes more than 100ms (feels instant otherwise)
    loadingDelayTimeout.current = setTimeout(() => {
      if (isMounted.current) {
        loadingStartTime.current = Date.now();
        setIsLoading(true);
      }
    }, 100);

    // Safety timeout - stop loading after 1.5 seconds max (feels faster)
    loadingTimeout.current = setTimeout(() => {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }, 1500);
  }, []);

  const stopLoading = useCallback(() => {
    if (!isMounted.current) return;
    
    // Clear the delay timeout so loading never shows if screen loads quickly
    if (loadingDelayTimeout.current) {
      clearTimeout(loadingDelayTimeout.current);
      loadingDelayTimeout.current = null;
    }
    
    if (loadingTimeout.current) {
      clearTimeout(loadingTimeout.current);
      loadingTimeout.current = null;
    }

    // Immediately stop loading - no delay
    setIsLoading(false);
  }, []);

  const forceStopLoading = useCallback(() => {
    if (loadingDelayTimeout.current) clearTimeout(loadingDelayTimeout.current);
    if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    setIsLoading(false);
  }, []);

  const markScreenReady = useCallback((screenName: string) => {
    visitedScreens.current.add(screenName);
    stopLoading();
  }, [stopLoading]);

  const isScreenVisited = useCallback((screenName: string) => {
    return visitedScreens.current.has(screenName);
  }, []);

  return (
    <NavigationLoadingContext.Provider
      value={{
        isLoading,
        startLoading,
        stopLoading,
        markScreenReady,
        isScreenVisited,
        forceStopLoading,
      }}
    >
      {children}
    </NavigationLoadingContext.Provider>
  );
};

export default NavigationLoadingContext;
