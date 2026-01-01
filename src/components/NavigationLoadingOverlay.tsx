import React, { useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigationLoading } from '../contexts/NavigationLoadingContext';

/**
 * Global navigation loading overlay that shows during screen transitions.
 * This component should be placed at the root level of the app, outside NavigationContainer.
 * 
 * Features:
 * - Ultra-fast fade in/out animations (50ms)
 * - Minimal, non-intrusive dot animation
 * - Non-blocking - allows touch events to pass through when not visible
 * - Only shows for slow screen loads (>100ms)
 */
const NavigationLoadingOverlay: React.FC = memo(() => {
  const { isLoading } = useNavigationLoading();
  const { theme, isDark } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) {
      // Ultra-fast fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }).start();

      // Simple, fast dot animation
      const dotAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      dotAnimation.start();

      return () => {
        dotAnimation.stop();
      };
    } else {
      // Instant fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, fadeAnim, dotAnim]);

  if (!isLoading) return null;

  // Semi-transparent background that doesn't feel heavy
  const backgroundColor = isDark 
    ? 'rgba(0, 0, 0, 0.7)' 
    : 'rgba(255, 255, 255, 0.85)';

  const dotColor = theme.colors.primary;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          backgroundColor,
        },
      ]}
      pointerEvents={isLoading ? 'auto' : 'none'}
    >
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: dotColor,
                opacity: dotAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: 
                    index === 0 ? [0.4, 1, 0.4] : 
                    index === 1 ? [0.7, 0.4, 0.7] : 
                    [1, 0.7, 1],
                }),
                transform: [
                  {
                    translateY: dotAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, -6, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
});

NavigationLoadingOverlay.displayName = 'NavigationLoadingOverlay';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default NavigationLoadingOverlay;
