import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
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
import QuickActionMenuButton from './QuickActionMenuButton';

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

const SwipeableBottomTabNavigator = React.memo(() => {
  const { isDark, theme } = useTheme();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      Promise.allSettled([
        loadInsightsScreen(),
        loadWalletScreen(),
        loadMoreScreen(),
      ]).catch(() => {});
    });

    return () => handle.cancel();
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
    switch (route.key) {
      case 'home':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <HomeScreen />
          </Suspense>
        );
      case 'insights':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <InsightsScreen />
          </Suspense>
        );
      case 'wallet':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <WalletScreen />
          </Suspense>
        );
      case 'more':
        return (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <MoreScreen />
          </Suspense>
        );
      default:
        return null;
    }
  }, []);

  // Memoized icon function
  const getIconName = useCallback((routeKey: string, focused: boolean) => {
    switch (routeKey) {
      case 'home':
        return focused ? 'home' : 'home-outline';
      case 'insights':
        return focused ? 'bar-chart' : 'bar-chart-outline';
      case 'wallet':
        return focused ? 'wallet' : 'wallet-outline';
      case 'more':
        return focused ? 'menu' : 'menu-outline';
      default:
        return 'help-outline';
    }
  }, []);

  const renderTabBar = useCallback((props: any) => (
    <View style={[
      styles.tabBarContainer,
      {
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border,
        paddingBottom: Math.max(insets.bottom, 8),
      }
    ]}>
      <View style={styles.tabBar}>
        {props.navigationState.routes.slice(0, 2).map((route: any, i: number) => {
          const focused = index === i;
          const iconName = getIconName(route.key, focused) as keyof typeof Ionicons.glyphMap;
          
          return (
            <Pressable
              key={route.key}
              style={styles.tabItem}
              onPress={() => {
                setIndex(i);
                props.jumpTo(route.key);
              }}
              android_ripple={{ color: theme.colors.primary + '20', borderless: true }}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[
                styles.tabLabel,
                {
                  color: focused ? theme.colors.primary : theme.colors.textSecondary,
                }
              ]}>
                {route.title}
              </Text>
            </Pressable>
          );
        })}
        
        {/* Center Quick Action Button */}
        <View style={styles.centerButtonContainer}>
          <QuickActionMenuButton color={theme.colors.primary} />
        </View>
        
        {props.navigationState.routes.slice(2).map((route: any, i: number) => {
          const actualIndex = i + 2;
          const focused = index === actualIndex;
          const iconName = getIconName(route.key, focused) as keyof typeof Ionicons.glyphMap;
          
          return (
            <Pressable
              key={route.key}
              style={styles.tabItem}
              onPress={() => {
                setIndex(actualIndex);
                props.jumpTo(route.key);
              }}
              android_ripple={{ color: theme.colors.primary + '20', borderless: true }}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[
                styles.tabLabel,
                {
                  color: focused ? theme.colors.primary : theme.colors.textSecondary,
                }
              ]}>
                {route.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  ), [index, theme, insets.bottom, getIconName]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
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
  tabBarContainer: {
    borderTopWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60, // Increased height to accommodate text
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
});

export default SwipeableBottomTabNavigator;