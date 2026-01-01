import React, { useEffect, useRef, ComponentType, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigationLoading } from '../contexts/NavigationLoadingContext';

interface WithNavigationLoadingOptions {
  screenName: string;
}

/**
 * Higher-Order Component that wraps screens to automatically handle navigation loading.
 * 
 * Features:
 * - Automatically shows loading indicator on first navigation to screen
 * - Marks screen as ready once content is rendered
 * - Skips loading animation for already-visited screens
 * - Handles cleanup on unmount
 * 
 * Usage:
 * const EnhancedScreen = withNavigationLoading(MyScreen, { screenName: 'MyScreen' });
 */
export function withNavigationLoading<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithNavigationLoadingOptions
): ComponentType<P> {
  const { screenName } = options;

  const WithNavigationLoadingWrapper: React.FC<P> = (props) => {
    const { markScreenReady, isScreenVisited, forceStopLoading } = useNavigationLoading();
    const hasMarkedReady = useRef(false);
    const isMounted = useRef(true);

    useEffect(() => {
      isMounted.current = true;
      
      return () => {
        isMounted.current = false;
      };
    }, []);

    const handleLayout = () => {
      if (hasMarkedReady.current || !isMounted.current) return;
      hasMarkedReady.current = true;

      // Use requestAnimationFrame for immediate response - no InteractionManager delay
      requestAnimationFrame(() => {
        if (isMounted.current) {
          markScreenReady(screenName);
        }
      });
    };

    // For already visited screens, force stop loading immediately
    useEffect(() => {
      if (isScreenVisited(screenName)) {
        forceStopLoading();
      }
    }, [isScreenVisited, forceStopLoading]);

    return (
      <View style={styles.container} onLayout={handleLayout}>
        <WrappedComponent {...props} />
      </View>
    );
  };

  WithNavigationLoadingWrapper.displayName = `withNavigationLoading(${screenName})`;

  return memo(WithNavigationLoadingWrapper) as ComponentType<P>;
}

/**
 * Wrapper component for lazy-loaded screens that automatically handles loading state.
 * Use this when you can't use the HOC pattern.
 */
interface ScreenLoadingWrapperProps {
  screenName: string;
  children: React.ReactNode;
}

export const ScreenLoadingWrapper: React.FC<ScreenLoadingWrapperProps> = memo(({ 
  screenName, 
  children 
}) => {
  const { markScreenReady, isScreenVisited, forceStopLoading } = useNavigationLoading();
  const hasMarkedReady = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleLayout = () => {
    if (hasMarkedReady.current || !isMounted.current) return;
    hasMarkedReady.current = true;

    // Use requestAnimationFrame for immediate response - no InteractionManager delay
    requestAnimationFrame(() => {
      if (isMounted.current) {
        markScreenReady(screenName);
      }
    });
  };

  // For already visited screens, force stop loading immediately
  useEffect(() => {
    if (isScreenVisited(screenName)) {
      forceStopLoading();
    }
  }, [isScreenVisited, forceStopLoading]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {children}
    </View>
  );
});

ScreenLoadingWrapper.displayName = 'ScreenLoadingWrapper';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default withNavigationLoading;
