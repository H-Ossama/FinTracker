import React from 'react';
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

  const handleTouch = () => {
    appLockService.recordActivity();
  };

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

export default TouchActivityWrapper;