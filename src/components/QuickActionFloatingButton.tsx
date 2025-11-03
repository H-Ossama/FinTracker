import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { quickActionsService, QuickAction } from '../services/quickActionsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ACTION_RADIUS = 120; // Radius of the circular menu
const BUTTON_SIZE = 60;
const ACTION_BUTTON_SIZE = 50;
const TAB_BAR_HEIGHT = 60; // Height of the tab bar

const QuickActionFloatingButton: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const actionAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Reload actions when screen is focused
  useEffect(() => {
    if (isFocused) {
      loadQuickActions();
    }
  }, [isFocused]);

  const loadQuickActions = async () => {
    try {
      const quickActions = await quickActionsService.getQuickActions();
      const enabledActions = quickActions.filter(action => action.enabled);
      setActions(enabledActions);
      
      // Initialize animations for each action
      enabledActions.forEach((action) => {
        if (!actionAnimations[action.id]) {
          actionAnimations[action.id] = new Animated.Value(0);
        }
      });
    } catch (error) {
      console.error('Error loading quick actions:', error);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Only capture touches that start on the main button, not on action buttons
        if (!isExpanded) return true;
        
        // Check if touch is on an action button
        const centerX = SCREEN_WIDTH / 2;
        const buttonBottom = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 10;
        const centerY = SCREEN_HEIGHT - buttonBottom - BUTTON_SIZE / 2;
        
        const touchX = evt.nativeEvent.pageX;
        const touchY = evt.nativeEvent.pageY;
        
        const allActions = [...actions, { id: 'settings', label: 'Settings', icon: 'settings', color: '#8E8E93', action: 'settings' }];
        
        // Check if touch is near any action button
        for (let i = 0; i < allActions.length; i++) {
          const angle = (i * (2 * Math.PI)) / allActions.length - Math.PI / 2;
          const actionX = centerX + Math.cos(angle) * ACTION_RADIUS;
          const actionY = centerY + Math.sin(angle) * ACTION_RADIUS;
          
          const distance = Math.sqrt(
            Math.pow(touchX - actionX, 2) + Math.pow(touchY - actionY, 2)
          );
          
          // If touch is on an action button, don't capture (let Pressable handle it)
          if (distance < ACTION_BUTTON_SIZE) {
            return false;
          }
        }
        
        return true;
      },
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        // User started touching the button - show radial menu
        handlePressIn();
      },
      
      onPanResponderMove: (evt, gestureState) => {
        if (isExpanded) {
          // Calculate which action the user is hovering over
          const centerX = SCREEN_WIDTH / 2;
          const buttonBottom = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 10;
          const centerY = SCREEN_HEIGHT - buttonBottom - BUTTON_SIZE / 2;
          
          const touchX = gestureState.moveX;
          const touchY = gestureState.moveY;
          
          let closestAction: string | null = null;
          let minDistance = Infinity;
          
          // Include settings action in the list
          const allActions = [...actions, { id: 'settings', label: 'Settings', icon: 'settings', color: '#8E8E93', action: 'settings' }];
          
          allActions.forEach((action, index) => {
            const angle = (index * (2 * Math.PI)) / allActions.length - Math.PI / 2;
            const actionX = centerX + Math.cos(angle) * ACTION_RADIUS;
            const actionY = centerY + Math.sin(angle) * ACTION_RADIUS;
            
            const distance = Math.sqrt(
              Math.pow(touchX - actionX, 2) + Math.pow(touchY - actionY, 2)
            );
            
            // Increased detection radius for easier selection
            if (distance < minDistance && distance < 80) {
              minDistance = distance;
              closestAction = action.id;
            }
          });
          
          // Only update if selection changed to avoid unnecessary re-renders
          if (closestAction !== selectedAction) {
            setSelectedAction(closestAction);
          }
        }
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        // User released the button
        const wasDragging = Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
        
        // If user selected an action (either by dragging OR by tapping on it)
        if (selectedAction) {
          // Navigate to the selected action
          setTimeout(() => {
            if (selectedAction === 'settings') {
              navigation.navigate('QuickActionsSettings' as never);
            } else {
              const action = actions.find(a => a.id === selectedAction);
              if (action) {
                executeAction(action.action);
              }
            }
          }, 100);
        }
        
        handlePressOut();
        setSelectedAction(null);
      },
    })
  ).current;

  const handlePressIn = () => {
    // Always show radial menu (settings option is always included)
    setIsExpanded(true);
    
    // Animate button scale
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      useNativeDriver: true,
      tension: 50,
      friction: 3,
    }).start();
    
    // Rotate button
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Fade in overlay
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    // Animate action buttons
    actions.forEach((action, index) => {
      Animated.spring(actionAnimations[action.id], {
        toValue: 1,
        delay: index * 30,
        useNativeDriver: true,
        tension: 40,
        friction: 5,
      }).start();
    });
    
    // Animate settings button (always last)
    if (!actionAnimations['settings']) {
      actionAnimations['settings'] = new Animated.Value(0);
    }
    Animated.spring(actionAnimations['settings'], {
      toValue: 1,
      delay: actions.length * 30,
      useNativeDriver: true,
      tension: 40,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    setIsExpanded(false);
    
    // Reset button scale
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    
    // Reset rotation
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    // Fade out overlay
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    // Hide action buttons
    actions.forEach((action) => {
      Animated.timing(actionAnimations[action.id], {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
    
    // Hide settings button
    if (actionAnimations['settings']) {
      Animated.timing(actionAnimations['settings'], {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  const executeAction = (actionName: string) => {
    try {
      // Map action names to screen navigation or modal opening
      const actionMap: { [key: string]: string } = {
        addExpense: 'AddExpense',
        addIncome: 'AddIncome',
        transfer: 'Transfer',
        addWallet: 'AddWallet',
        addGoal: 'Goals',
        addReminder: 'RemindersNotifications',
        insights: 'Insights',
        budget: 'BudgetPlanner',
        bills: 'BillsTracker',
        goals: 'Goals',
        borrowedMoney: 'BorrowedMoneyHistory',
      };
      
      const screenName = actionMap[actionName];
      if (screenName) {
        navigation.navigate(screenName as never);
      }
    } catch (error) {
      console.error('Action execution error:', error);
    }
  };

  const getActionPosition = (index: number) => {
    const totalActions = actions.length + 1; // +1 for settings
    const angle = (index * (2 * Math.PI)) / totalActions - Math.PI / 2; // Start from top
    return {
      x: Math.cos(angle) * ACTION_RADIUS,
      y: Math.sin(angle) * ACTION_RADIUS,
    };
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Calculate button position above tab bar
  const buttonBottom = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 10;
  const actionsContainerBottom = buttonBottom + 10;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay when expanded */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: opacityAnim,
            },
          ]}
          onTouchEnd={() => {
            // Close menu if user taps outside
            handlePressOut();
            setSelectedAction(null);
          }}
        >
          {/* Dark overlay base */}
          <Animated.View 
            style={[
              styles.darkOverlay,
              { opacity: opacityAnim }
            ]} 
          />
          
          {/* Subtle texture effect */}
          <Animated.View 
            style={[
              styles.textureOverlay,
              { 
                opacity: opacityAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5]
                })
              }
            ]} 
          />
        </Animated.View>
      )}

      {/* Action buttons */}
      {isExpanded && (
        <View style={[styles.actionsContainer, { bottom: actionsContainerBottom }]} pointerEvents="box-none" collapsable={false}>
          {/* Render user actions */}
          {actions.map((action, index) => {
            const position = getActionPosition(index);
            const isSelected = selectedAction === action.id;
            
            const scale = actionAnimations[action.id]?.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }) || new Animated.Value(0);
            
            const selectedScale = isSelected ? 1.3 : 1;
            
            const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
            
            const handleActionPress = () => {
              handlePressOut();
              setTimeout(() => {
                executeAction(action.action);
              }, 100);
            };
            
            return (
              <AnimatedPressable
                key={action.id}
                onPress={handleActionPress}
                onPressIn={() => setSelectedAction(action.id)}
                onPressOut={() => setSelectedAction(null)}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: action.color,
                    transform: [
                      { translateX: position.x },
                      { translateY: position.y },
                      { scale: Animated.multiply(scale, selectedScale) },
                    ],
                    opacity: scale,
                  },
                ]}
              >
                <Ionicons name={action.icon as any} size={24} color="white" />
                {isSelected && (
                  <View style={[styles.labelContainer, { backgroundColor: action.color }]}>
                    <Text style={styles.labelText}>{action.label}</Text>
                  </View>
                )}
              </AnimatedPressable>
            );
          })}
          
          {/* Always render settings button */}
          {(() => {
            const settingsIndex = actions.length;
            const position = getActionPosition(settingsIndex);
            const isSelected = selectedAction === 'settings';
            const settingsColor = '#8E8E93';
            
            if (!actionAnimations['settings']) {
              actionAnimations['settings'] = new Animated.Value(0);
            }
            
            const scale = actionAnimations['settings'];
            const selectedScale = isSelected ? 1.3 : 1;
            
            const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
            
            const handleSettingsPress = () => {
              handlePressOut();
              setTimeout(() => {
                navigation.navigate('QuickActionsSettings' as never);
              }, 100);
            };
            
            return (
              <AnimatedPressable
                key="settings"
                onPress={handleSettingsPress}
                onPressIn={() => setSelectedAction('settings')}
                onPressOut={() => setSelectedAction(null)}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: settingsColor,
                    transform: [
                      { translateX: position.x },
                      { translateY: position.y },
                      { scale: Animated.multiply(scale, selectedScale) },
                    ],
                    opacity: scale,
                  },
                ]}
              >
                <Ionicons name="settings" size={24} color="white" />
                {isSelected && (
                  <View style={[styles.labelContainer, { backgroundColor: settingsColor }]}>
                    <Text style={styles.labelText}>Settings</Text>
                  </View>
                )}
              </AnimatedPressable>
            );
          })()}
        </View>
      )}

      {/* Main button */}
      <Animated.View
        style={[
          styles.mainButton,
          {
            bottom: buttonBottom,
            backgroundColor: theme.colors.primary,
            transform: [
              { scale: scaleAnim },
              { rotate: rotation },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.buttonContent}>
          <Ionicons 
            name={isExpanded ? "close" : "apps"} 
            size={28} 
            color="white" 
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  textureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  blurLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  blurLayer2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  blurLayer3: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    opacity: 0.7,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  radialGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderRadius: SCREEN_WIDTH,
    transform: [{ scale: 2 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: SCREEN_WIDTH / 2,
    elevation: 50,
  },
  actionsContainer: {
    position: 'absolute',
    // bottom is set dynamically
    left: SCREEN_WIDTH / 2,
    width: 0,
    height: 0,
    zIndex: 1001,
  },
  actionButton: {
    position: 'absolute',
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: ACTION_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -ACTION_BUTTON_SIZE / 2,
    marginTop: -ACTION_BUTTON_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  labelContainer: {
    position: 'absolute',
    bottom: -30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  labelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  mainButton: {
    position: 'absolute',
    // bottom is set dynamically
    left: SCREEN_WIDTH / 2 - BUTTON_SIZE / 2,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 1000,
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default QuickActionFloatingButton;
