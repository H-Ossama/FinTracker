import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, InteractionManager } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ScreenWrapperProps {
  children: React.ReactNode;
  delayMs?: number;
  showLoader?: boolean;
}

/**
 * Wrapper component that delays rendering until after navigation interactions
 * This helps improve navigation performance by avoiding expensive renders during transitions
 */
const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ 
  children, 
  delayMs = 0, 
  showLoader = true 
}) => {
  const [isReady, setIsReady] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      if (delayMs > 0) {
        timeoutId = setTimeout(() => {
          setIsReady(true);
        }, delayMs);
      } else {
        setIsReady(true);
      }
    });

    return () => {
      interactionTask.cancel();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [delayMs]);

  if (!isReady) {
    if (showLoader) {
      return (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }
    
    // Return empty view if loader is disabled
    return (
      <View style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }} />
    );
  }

  return <>{children}</>;
};

export default React.memo(ScreenWrapper);