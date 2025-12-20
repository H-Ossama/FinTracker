import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useWalletVisibility } from '../hooks/useWalletVisibility';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;

interface SwipeableWalletDisplayProps {
  wallets: any[];
  onWalletChange: (wallet: any, index: number) => void;
  currentWalletIndex: number;
  isBalanceVisible: boolean;
  formatCurrency: (value: number) => string;
  getWalletIcon: (type: string) => string;
}

const SwipeableWalletDisplay: React.FC<SwipeableWalletDisplayProps> = ({
  wallets,
  onWalletChange,
  currentWalletIndex,
  isBalanceVisible,
  formatCurrency,
  getWalletIcon,
}) => {
  const { theme } = useTheme();
  const { formatWalletBalance } = useWalletVisibility();
  const panY = useRef(new Animated.Value(0)).current;
  const [walletIndex, setWalletIndex] = useState(currentWalletIndex);
  const walletIndexRef = useRef(currentWalletIndex);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, { dy }) => Math.abs(dy) > 5,
      onMoveShouldSetPanResponderCapture: (evt, { dy }) => Math.abs(dy) > 5,
      onPanResponderMove: (evt, { dy }) => {
        panY.setValue(dy);
      },
      onPanResponderRelease: (evt, { dy, vy }) => {
        const currentIndex = walletIndexRef.current;
        // Swipe up to next wallet
        if (dy < -SWIPE_THRESHOLD && currentIndex < wallets.length - 1) {
          const nextIndex = currentIndex + 1;
          walletIndexRef.current = nextIndex;
          setWalletIndex(nextIndex);
          onWalletChange(wallets[nextIndex], nextIndex);
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
        // Swipe down to previous wallet
        else if (dy > SWIPE_THRESHOLD && currentIndex > 0) {
          const prevIndex = currentIndex - 1;
          walletIndexRef.current = prevIndex;
          setWalletIndex(prevIndex);
          onWalletChange(wallets[prevIndex], prevIndex);
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        } else {
          // Snap back
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    walletIndexRef.current = currentWalletIndex;
    setWalletIndex(currentWalletIndex);
  }, [currentWalletIndex]);

  const wallet = wallets[walletIndex];

  if (!wallet || wallets.length === 0) {
    return null;
  }

  // Get wallet icon based on type
  const getIconName = (type: string) => {
    switch (type.toUpperCase()) {
      case 'BANK':
      case 'CREDIT_CARD':
        return 'card';
      case 'CASH':
        return 'cash';
      case 'SAVINGS':
      case 'INVESTMENT':
        return 'wallet';
      default:
        return 'wallet';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: panY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.walletDisplayContainer}>
        <View style={styles.contentWrapper}>
          {/* Left Side: Wallet Info */}
          <View style={styles.walletInfo}>
            <View style={styles.walletIconAndName}>
              {/* Wallet Icon */}
              <View style={[styles.walletIconContainer, { backgroundColor: wallet.color }]}>
                <Ionicons
                  name={getIconName(wallet.type)}
                  size={16}
                  color="white"
                  style={styles.walletIcon}
                />
              </View>

              {/* Wallet Name */}
              <Text style={[styles.walletNameText, { color: theme.colors.headerTextSecondary }]}>
                {wallet.name}
              </Text>
            </View>

            {/* Wallet Balance */}
            <Text style={[styles.walletBalance, { color: theme.colors.headerText }]}>
              {isBalanceVisible ? formatWalletBalance(wallet.balance, wallet.id) : '••••••'}
            </Text>
          </View>

          {/* Right Side: Dots and Arrows */}
          {wallets.length > 1 && (
            <View style={styles.indicatorsContainer}>
              {/* Navigation Dots - Vertical */}
              <View style={styles.dotsContainer}>
                {wallets.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          index === walletIndex
                            ? theme.colors.headerText
                            : theme.colors.headerTextSecondary,
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Swipe Indicator - Vertical */}
              <View style={styles.swipeIndicator}>
                {walletIndex > 0 && (
                  <Ionicons name="chevron-up" size={14} color={theme.colors.headerTextSecondary} />
                )}
                {walletIndex < wallets.length - 1 && (
                  <Ionicons name="chevron-down" size={14} color={theme.colors.headerTextSecondary} />
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 2,
  },
  walletDisplayContainer: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  contentWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walletInfo: {
    flex: 1,
  },
  walletIconAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  walletIcon: {
    fontWeight: 'bold',
  },
  walletNameText: {
    fontSize: 14,
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 12,
  },
  dotsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  swipeIndicator: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
    gap: 4,
  },
});

export default SwipeableWalletDisplay;
