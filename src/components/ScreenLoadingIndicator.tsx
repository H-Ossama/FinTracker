import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ScreenLoadingIndicatorProps {
  visible: boolean;
  message?: string;
}

/**
 * Elegant loading indicator that follows the new design system
 * Uses the dark theme from the header for consistency
 */
const ScreenLoadingIndicator: React.FC<ScreenLoadingIndicatorProps> = ({ 
  visible, 
  message = 'Loading...' 
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Start dot animation
      const dotAnimation = Animated.loop(
        Animated.stagger(150, [
          Animated.sequence([
            Animated.timing(dotAnim1, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim1, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim2, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim2, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim3, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim3, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      // Pulse animation for the outer ring
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      dotAnimation.start();
      pulseAnimation.start();

      return () => {
        dotAnimation.stop();
        pulseAnimation.stop();
      };
    } else {
      // Fade out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const dotTransform1 = dotAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const dotTransform2 = dotAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const dotTransform3 = dotAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
          backgroundColor: theme.colors.headerBackground,
        }
      ]}
    >
      <Animated.View 
        style={[
          styles.loadingBox,
          {
            transform: [{ scale: scaleAnim }],
            backgroundColor: theme.colors.headerSurface,
          }
        ]}
      >
        {/* Pulse ring */}
        <Animated.View 
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: theme.colors.primary,
            }
          ]}
        />

        {/* Animated dots */}
        <View style={styles.dotsContainer}>
          <Animated.View 
            style={[
              styles.dot,
              { 
                backgroundColor: theme.colors.primary,
                transform: [{ translateY: dotTransform1 }],
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot,
              { 
                backgroundColor: theme.colors.primary,
                transform: [{ translateY: dotTransform2 }],
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot,
              { 
                backgroundColor: theme.colors.primary,
                transform: [{ translateY: dotTransform3 }],
              }
            ]} 
          />
        </View>

        {/* Loading text */}
        <Text style={[styles.loadingText, { color: theme.colors.headerTextSecondary }]}>
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

/**
 * Minimal inline loading indicator for use within screens
 */
export const InlineLoadingIndicator: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({ 
  size = 'medium' 
}) => {
  const { theme } = useTheme();
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  const dotSize = size === 'small' ? 6 : size === 'large' ? 12 : 8;
  const spacing = size === 'small' ? 4 : size === 'large' ? 8 : 6;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.stagger(100, [
        Animated.sequence([
          Animated.timing(dotAnim1, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(dotAnim1, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dotAnim2, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(dotAnim2, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dotAnim3, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(dotAnim3, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={[styles.inlineContainer, { gap: spacing }]}>
      {[dotAnim1, dotAnim2, dotAnim3].map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: theme.colors.primary,
              transform: [{
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -6],
                }),
              }],
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            }
          ]}
        />
      ))}
    </View>
  );
};

/**
 * Full screen loading overlay with blur effect
 */
export const FullScreenLoader: React.FC<{ 
  visible: boolean; 
  message?: string;
  transparent?: boolean;
}> = ({ 
  visible, 
  message = 'Loading...',
  transparent = false,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      spin.start();

      return () => spin.stop();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Transparent mode: ring only, no card or text
  if (transparent) {
    return (
      <Animated.View 
        style={[
          styles.fullScreenContainer,
          { 
            opacity: fadeAnim,
            backgroundColor: 'transparent',
          }
        ]}
        pointerEvents="none"
      >
        <Animated.View 
          style={[
            styles.spinnerRing,
            {
              transform: [{ rotate: spin }],
              borderColor: theme.colors.headerBorder,
              borderTopColor: theme.colors.primary,
            }
          ]}
        />
      </Animated.View>
    );
  }

  // Normal mode: ring with card background and text
  return (
    <Animated.View 
      style={[
        styles.fullScreenContainer,
        { 
          opacity: fadeAnim,
          backgroundColor: theme.colors.headerBackground,
        }
      ]}
    >
      <View style={[styles.loaderCard, { backgroundColor: theme.colors.headerSurface }]}>
        {/* Spinning ring */}
        <Animated.View 
          style={[
            styles.spinnerRing,
            {
              transform: [{ rotate: spin }],
              borderColor: theme.colors.headerBorder,
              borderTopColor: theme.colors.primary,
            }
          ]}
        />
        
        <Text style={[styles.fullScreenText, { color: theme.colors.headerText }]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingBox: {
    width: 120,
    height: 120,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    opacity: 0.3,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  inlineContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loaderCard: {
    width: 160,
    height: 140,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  spinnerRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    marginBottom: 16,
  },
  fullScreenText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default ScreenLoadingIndicator;
