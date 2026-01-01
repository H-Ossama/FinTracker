import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Text, ActivityIndicator, InteractionManager } from 'react-native';
import { TabView } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Lazy load screens for better performance
const loadHomeScreen = () => import('../screens/HomeScreen');
const HomeScreen = lazy(loadHomeScreen);
const loadInsightsScreen = () => import('../screens/InsightsScreen');
const InsightsScreen = lazy(loadInsightsScreen);
const loadWalletScreen = () => import('../screens/WalletScreen');
const WalletScreen = lazy(loadWalletScreen);
const loadMoreScreen = () => import('../screens/MoreScreen');
const MoreScreen = lazy(loadMoreScreen);

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useNavigationLoading } from '../contexts/NavigationLoadingContext';
import QuickActionsOverlay from './QuickActionsOverlay';

const initialLayout = { width: Dimensions.get('window').width };

// Loading fallback for lazy-loaded screens
const ScreenLoadingFallback = memo(() => {
  const { theme } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
});

// Screen content wrapper that tracks when content is actually rendered
interface ScreenContentWrapperProps {
  children: React.ReactNode;
  screenName: string;
}

const ScreenContentWrapper: React.FC<ScreenContentWrapperProps> = memo(({ 
  children, 
  screenName 
}) => {
  const { markScreenReady, isScreenVisited, forceStopLoading } = useNavigationLoading();
  const hasNotifiedReady = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // If screen was already visited, force stop loading immediately (no delay)
    if (isScreenVisited(screenName)) {
      forceStopLoading();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [screenName, isScreenVisited, forceStopLoading]);

  const notifyReady = useCallback(() => {
    if (hasNotifiedReady.current || !isMounted.current) return;
    hasNotifiedReady.current = true;

    // Use requestAnimationFrame for immediate response after layout
    requestAnimationFrame(() => {
      if (isMounted.current) {
        markScreenReady(screenName);
      }
    });
  }, [markScreenReady, screenName]);

  return (
    <View style={styles.sceneWrapper} onLayout={notifyReady}>
      {children}
    </View>
  );
});

const SwipeableBottomTabNavigator = React.memo(() => {
  const { isDark, theme } = useTheme();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const { startLoading, isScreenVisited } = useNavigationLoading();
  const [index, setIndex] = useState(0);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const isMounted = useRef(false);

  // Tab screen names for tracking
  const tabScreenNames = useMemo(() => ['TabHome', 'TabInsights', 'TabWallet', 'TabMore'], []);

  useEffect(() => {
    isMounted.current = true;

    // Preload other tab screens in the background after initial mount
    const handle = InteractionManager.runAfterInteractions(() => {
      Promise.allSettled([
        loadInsightsScreen(),
        loadWalletScreen(),
        loadMoreScreen(),
      ]).catch(() => {});
    });

    return () => {
      isMounted.current = false;
      handle.cancel();
    };
  }, []);
  
  // Memoize routes to prevent unnecessary re-renders
  const routes = useMemo(() => [
    { key: 'home', title: t('home') },
    { key: 'insights', title: t('insights') },
    { key: 'wallet', title: t('wallet') },
    { key: 'more', title: t('more') },
  ], [t]);

  const currentTabScreenName = tabScreenNames[index] || 'TabHome';

  // Memoized scene renderer with lazy loading
  const renderScene = useCallback(({ route }: { route: any }) => {
    const screenIndex = routes.findIndex(r => r.key === route.key);
    const screenName = tabScreenNames[screenIndex] || route.key;

    switch (route.key) {
      case 'home':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <ScreenContentWrapper screenName={screenName}>
              <HomeScreen />
            </ScreenContentWrapper>
          </Suspense>
        );
      case 'insights':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <ScreenContentWrapper screenName={screenName}>
              <InsightsScreen />
            </ScreenContentWrapper>
          </Suspense>
        );
      case 'wallet':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <ScreenContentWrapper screenName={screenName}>
              <WalletScreen />
            </ScreenContentWrapper>
          </Suspense>
        );
      case 'more':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <ScreenContentWrapper screenName={screenName}>
              <MoreScreen />
            </ScreenContentWrapper>
          </Suspense>
        );
      default:
        return null;
    }
  }, [routes, tabScreenNames]);

  // Memoized icon function - using Ionicons to match the design
  const getIconName = useCallback((routeKey: string, focused: boolean) => {
    switch (routeKey) {
      case 'home':
        return focused ? 'home' : 'home-outline';
      case 'insights':
        return focused ? 'pie-chart' : 'pie-chart-outline';
      case 'wallet':
        return focused ? 'wallet' : 'wallet-outline';
      case 'more':
        return focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline';
      default:
        return 'help-circle-outline';
    }
  }, []);

  const handleIndexChange = useCallback((newIndex: number) => {
    // Update state
    if (isMounted.current) {
      setIndex(newIndex);
    }
  }, []);

  const renderTabBar = useCallback((props: any) => (
    <View
      style={[
        styles.tabBarWrapper,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          bottom: 0,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {/* Left tabs */}
          {props.navigationState.routes.slice(0, 2).map((route: any, i: number) => {
            const focused = index === i;
            const iconName = getIconName(route.key, focused);
            const activeColor = '#FFFFFF';
            const inactiveColor = '#8E8E93';

            return (
              <Pressable
                key={route.key}
                style={styles.tabItem}
                onPress={() => {
                  handleIndexChange(i);
                  props.jumpTo(route.key);
                }}
                android_ripple={{ color: 'transparent' }}
              >
                <View style={styles.tabIconWrapper}>
                  <Ionicons name={iconName as any} size={24} color={focused ? activeColor : inactiveColor} />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: focused ? activeColor : inactiveColor,
                      fontWeight: focused ? '600' : '400',
                    },
                  ]}
                >
                  {route.title}
                </Text>
              </Pressable>
            );
          })}

          {/* Center Quick Actions button */}
          <Pressable
            style={styles.quickSlot}
            onPress={() => setQuickActionsOpen(true)}
            android_ripple={{ color: 'transparent' }}
          >
            <View style={[styles.quickButton, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="apps" size={26} color="#FFFFFF" />
            </View>
            <Text style={[styles.tabLabel, { color: '#FFFFFF', fontWeight: '600' }]}>
              {t('quick') || 'Quick'}
            </Text>
          </Pressable>

          {/* Right tabs */}
          {props.navigationState.routes.slice(2).map((route: any, offset: number) => {
            const i = offset + 2;
            const focused = index === i;
            const iconName = getIconName(route.key, focused);
            const activeColor = '#FFFFFF';
            const inactiveColor = '#8E8E93';

            return (
              <Pressable
                key={route.key}
                style={styles.tabItem}
                onPress={() => {
                  handleIndexChange(i);
                  props.jumpTo(route.key);
                }}
                android_ripple={{ color: 'transparent' }}
              >
                <View style={styles.tabIconWrapper}>
                  <Ionicons name={iconName as any} size={24} color={focused ? activeColor : inactiveColor} />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: focused ? activeColor : inactiveColor,
                      fontWeight: focused ? '600' : '400',
                    },
                  ]}
                >
                  {route.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  ), [getIconName, handleIndexChange, index, insets.bottom, t, theme.colors.primary]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={handleIndexChange}
        initialLayout={initialLayout}
        renderTabBar={renderTabBar}
        tabBarPosition="bottom"
        swipeEnabled={true}
        lazy={true}
        lazyPreloadDistance={1}
        animationEnabled={true}
      />

      <QuickActionsOverlay visible={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sceneWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  tabBarContainer: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: '#000000',
    borderRadius: 34,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 14,
  },
  tabBar: {
    flexDirection: 'row',
    height: 68,
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  quickSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  quickButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    transform: [{ translateY: -10 }],
    borderWidth: 4,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
});

export default SwipeableBottomTabNavigator;