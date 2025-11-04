import React, { useCallback, useRef } from 'react';
import { View, ViewProps } from 'react-native';
import AppLockService from '../services/appLockService';

interface TouchActivityWrapperProps extends ViewProps {
  children: React.ReactNode;
}

const TouchActivityWrapper: React.FC<TouchActivityWrapperProps> = ({ 
  children, 
  style, 
  ...props 
}) => {
  const appLockService = AppLockService.getInstance();
  const lastTouchTime = useRef(0);
  const DEBOUNCE_DELAY = 1000; // Only record activity once per second

  const handleTouch = useCallback(() => {
    const now = Date.now();
    // Debounce touch events to reduce battery usage
    if (now - lastTouchTime.current > DEBOUNCE_DELAY) {
      lastTouchTime.current = now;
      appLockService.recordActivity();
    }
  }, [appLockService]);

  return (
    <View
      style={[{ flex: 1 }, style]}
      onTouchStart={handleTouch}
      onStartShouldSetResponder={() => false} // Don't interfere with child components
      {...props}
    >
      {children}
    </View>
  );
};

export default React.memo(TouchActivityWrapper);