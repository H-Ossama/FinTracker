import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Text, ActivityIndicator, InteractionManager, Platform } from 'react-native';
import { TabView } from 'react-native-tab-view';
import { Ionicons, Feather } from '@expo/vector-icons';
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
import { FullScreenLoader } from './ScreenLoadingIndicator';

const initialLayout = { width: Dimensions.get('window').width };

// Loading fallback for lazy-loaded screens
const ScreenLoadingFallback = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
};

// Screen content wrapper that tracks when content is actually rendered
interface ScreenContentWrapperProps {
  children: React.ReactNode;
  onContentReady?: () => void;
}

const ScreenContentWrapper: React.FC<ScreenContentWrapperProps> = ({ 
  children, 
  onContentReady 
}) => {
  useEffect(() => {
    // Call onContentReady after the content has been laid out
    const timeoutId = setTimeout(() => {
      onContentReady?.();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [onContentReady]);

  return <>{children}</>;
};

const SwipeableBottomTabNavigator = React.memo(() => {
  const { isDark, theme } = useTheme();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);
  const tabSwitchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);
  const visitedTabs = useRef<Set<number>>(new Set([0])); // Home tab is visited on mount

  useEffect(() => {
    isMounted.current = true;

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

  useEffect(() => {
    return () => {
      if (tabSwitchTimeout.current) {
        clearTimeout(tabSwitchTimeout.current);
      }
    };
  }, []);
  
  // Memoize routes to prevent unnecessary re-renders
  const routes = useMemo(() => [
    { key: 'home', title: t('home') },
    { key: 'insights', title: t('insights') },
    { key: 'wallet', title: t('wallet') },
    { key: 'more', title: t('more') },
  ], [t]);

  // Memoized scene renderer with lazy loading
  const renderScene = useCallback(({ route }: { route: any }) => {
    const handleContentReady = () => {
      if (isMounted.current) {
        setIsSwitching(false);
      }
    };

    switch (route.key) {
      case 'home':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <ScreenContentWrapper onContentReady={handleContentReady}>
              <HomeScreen />
            </ScreenContentWrapper>
          </Suspense>
        );
      case 'insights':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <ScreenContentWrapper onContentReady={handleContentReady}>
              <InsightsScreen />
            </ScreenContentWrapper>
          </Suspense>
        );
      case 'wallet':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <ScreenContentWrapper onContentReady={handleContentReady}>
              <WalletScreen />
            </ScreenContentWrapper>
          </Suspense>
        );
      case 'more':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <ScreenContentWrapper onContentReady={handleContentReady}>
              <MoreScreen />
            </ScreenContentWrapper>
          </Suspense>
        );
      default:
        return null;
    }
  }, []);

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
    const isNewTab = !visitedTabs.current.has(newIndex);

    // Only show loader for new/unvisited tabs
    if (isNewTab && isMounted.current) {
      setIsSwitching(true);

      if (tabSwitchTimeout.current) {
        clearTimeout(tabSwitchTimeout.current);
      }

      // Set a max timeout to prevent infinite loading, but content ready callback will dismiss it first
      tabSwitchTimeout.current = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          if (isMounted.current) {
            setIsSwitching(false);
          }
        });
      }, 2000); // Increased timeout to give content time to render
    }

    // Mark tab as visited
    visitedTabs.current.add(newIndex);

    // Update state
    if (isMounted.current) {
      setIndex(newIndex);
    }
  }, []);

  const renderTabBar = useCallback((props: any) => (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {props.navigationState.routes.map((route: any, i: number) => {
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
                  <Ionicons
                    name={iconName as any}
                    size={24}
                    color={focused ? activeColor : inactiveColor}
                  />
                </View>
                <Text style={[
                  styles.tabLabel,
                  {
                    color: focused ? activeColor : inactiveColor,
                    fontWeight: focused ? '600' : '400',
                  }
                ]}>
                  {route.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: insets.bottom, backgroundColor: '#000000' }} />
      </View>
    </View>
  ), [index, insets.bottom, getIconName]);

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
        removeClippedSubviews={true}
        optimizationsEnabled={true}
        animationEnabled={true}
        sceneContainerStyle={{ backgroundColor: 'transparent' }}
      />

      <FullScreenLoader visible={isSwitching} message={t('loading') || 'Loading...'} transparent />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarWrapper: {
    backgroundColor: 'transparent',
  },
  tabBarContainer: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    paddingTop: 8,
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
});

export default SwipeableBottomTabNavigator;