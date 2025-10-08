import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Text } from 'react-native';
import { TabView } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import WalletScreen from '../screens/WalletScreen';
import MoreScreen from '../screens/MoreScreen';
import { useTheme } from '../contexts/ThemeContext';

const initialLayout = { width: Dimensions.get('window').width };

const SwipeableBottomTabNavigator = () => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'home', title: 'Home' },
    { key: 'insights', title: 'Insights' },
    { key: 'wallet', title: 'Wallet' },
    { key: 'more', title: 'More' },
  ]);

  const renderScene = ({ route }: { route: any }) => {
    switch (route.key) {
      case 'home':
        return <HomeScreen />;
      case 'insights':
        return <InsightsScreen />;
      case 'wallet':
        return <WalletScreen />;
      case 'more':
        return <MoreScreen />;
      default:
        return null;
    }
  };

  const getIconName = (routeKey: string, focused: boolean) => {
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
        return 'ellipse-outline';
    }
  };

  const renderTabBar = (props: any) => (
    <View style={[
      styles.tabBarContainer,
      {
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        paddingBottom: Math.max(insets.bottom, 8), // Minimal bottom padding
      }
    ]}>
      <View style={styles.tabBar}>
        {props.navigationState.routes.map((route: any, i: number) => {
          const focused = index === i;
          const iconName = getIconName(route.key, focused) as keyof typeof Ionicons.glyphMap;
          
          return (
            <Pressable
              key={route.key}
              style={styles.tabItem}
              onPress={() => setIndex(i)}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? '#007AFF' : (isDark ? '#8E8E93' : 'gray')}
              />
              <Text style={[
                styles.tabLabel,
                {
                  color: focused ? '#007AFF' : (isDark ? '#8E8E93' : 'gray'),
                }
              ]}>
                {route.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={initialLayout}
        renderTabBar={renderTabBar}
        tabBarPosition="bottom"
        swipeEnabled={true}
        lazy={true}
        animationEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarContainer: {
    borderTopWidth: 0, // Remove the black line
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
});

export default SwipeableBottomTabNavigator;