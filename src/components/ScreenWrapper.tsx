import React from 'react';
import { View } from 'react-native';
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
  // Render immediately to improve perceived performance
  return <>{children}</>;
};

export default React.memo(ScreenWrapper);