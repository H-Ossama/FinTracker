import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useQuickActions } from '../contexts/QuickActionsContext';
import { quickActionsService, QuickAction } from '../services/quickActionsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ACTION_RADIUS = 120;
const ACTION_BUTTON_SIZE = 56;
const MAIN_BUTTON_SIZE = 56;

interface QuickActionMenuButtonProps {
  color?: string;
}

const QuickActionMenuButton: React.FC<QuickActionMenuButtonProps> = ({
  color = '#007AFF',
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const quickActions = useQuickActions();
  const isFocused = useIsFocused();
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [longPressActive, setLongPressActive] = useState(false);
  
  // Enhanced animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const actionAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Reload actions when screen is focused
  useEffect(() => {
    if (isFocused) {
      loadQuickActions();
      // Start subtle pulse animation
      startPulseAnimation();
    }
  }, [isFocused]);

  const startPulseAnimation = () => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
  };

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
      
      // Initialize settings animation
      if (!actionAnimations['settings']) {
        actionAnimations['settings'] = new Animated.Value(0);
      }
    } catch (error) {
      console.error('Error loading quick actions:', error);
    }
  };

  const handlePress = () => {
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const openMenu = () => {
    setIsExpanded(true);
    
    // Enhanced ripple effect
    Animated.sequence([
      Animated.timing(rippleScale, {
        toValue: 3,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rippleScale, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Animate main button
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
        tension: 100,
        friction: 5,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Staggered animation for action buttons
    const allActions = [...actions, { id: 'settings', label: 'Settings', icon: 'settings', color: '#8E8E93' }];
    allActions.forEach((action, index) => {
      Animated.spring(actionAnimations[action.id], {
        toValue: 1,
        delay: index * 80,
        useNativeDriver: true,
        tension: 80,
        friction: 6,
      }).start();
    });
  };

  const closeMenu = () => {
    setIsExpanded(false);
    setSelectedAction(null);
    setLongPressActive(false);
    
    // Animate main button back
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Hide action buttons with reverse animation
    const allActions = [...actions, { id: 'settings' }];
    allActions.forEach((action, index) => {
      Animated.timing(actionAnimations[action.id], {
        toValue: 0,
        delay: (allActions.length - index) * 30,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleActionPress = (actionId: string) => {
    closeMenu();
    
    setTimeout(() => {
      if (actionId === 'settings') {
        navigation.navigate('QuickActionsSettings' as never);
      } else {
        const action = actions.find(a => a.id === actionId);
        if (action) {
          executeAction(action.action);
        }
      }
    }, 100);
  };

  const executeAction = (actionName: string) => {
    try {
      // Map action names to appropriate navigation or modal triggers
      const actionMap: { [key: string]: () => void } = {
        addExpense: () => {
          quickActions.triggerAddExpense();
        },
        addIncome: () => {
          navigation.navigate('AddIncome' as never);
        },
        transfer: () => {
          quickActions.triggerTransfer();
        },
        addWallet: () => {
          quickActions.triggerAddWallet();
        },
        addGoal: () => {
          navigation.navigate('SavingsGoals' as never);
        },
        addReminder: () => {
          navigation.navigate('BillsReminder' as never);
        },
        insights: () => {
          navigation.navigate('TabNavigator' as never);
          // TODO: Navigate to insights tab specifically
        },
        budget: () => {
          navigation.navigate('BudgetPlanner' as never);
        },
        bills: () => {
          navigation.navigate('BillsReminder' as never);
        },
        goals: () => {
          navigation.navigate('SavingsGoals' as never);
        },
        borrowedMoney: () => {
          navigation.navigate('BorrowedMoneyHistory' as never);
        },
      };
      
      const actionFunction = actionMap[actionName];
      if (actionFunction) {
        actionFunction();
      } else {
        console.warn(`Unknown action: ${actionName}`);
      }
    } catch (error) {
      console.error('Action execution error:', error);
    }
  };

  const getActionPosition = (index: number, totalCount: number) => {
    // Position actions in a perfect circle around the center button
    const angle = (index * (2 * Math.PI)) / totalCount - Math.PI / 2; // Start from top
    
    return {
      x: Math.cos(angle) * ACTION_RADIUS,
      y: Math.sin(angle) * ACTION_RADIUS,
    };
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const allActionsCount = actions.length + 1; // +1 for settings

  return (
    <View style={styles.container}>
      {/* Enhanced Overlay with Dark Tint Effect */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
            },
          ]}
          pointerEvents="auto"
        >
          {/* Dark overlay base */}
          <Animated.View 
            style={[
              styles.darkOverlay,
              { opacity: overlayOpacity }
            ]} 
          />
          
          {/* Subtle noise/texture effect */}
          <Animated.View 
            style={[
              styles.textureOverlay,
              { 
                opacity: overlayOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5]
                })
              }
            ]} 
          />
          
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeMenu}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Action buttons container positioned above the tab bar */}
      {isExpanded && (
        <View style={styles.actionsContainer} pointerEvents="box-none">
          {/* User actions */}
          {actions.map((action, index) => {
            const position = getActionPosition(index, allActionsCount);
            const isSelected = selectedAction === action.id;
            const scale = actionAnimations[action.id] || new Animated.Value(0);
            
            return (
              <Animated.View
                key={action.id}
                style={[
                  styles.actionButton,
                  {
                    transform: [
                      { translateX: position.x },
                      { translateY: position.y },
                      { scale: scale },
                    ],
                    opacity: scale,
                  },
                ]}
              >
                <Pressable
                  style={[
                    styles.actionPressable,
                    {
                      backgroundColor: action.color,
                      borderColor: action.color,
                      transform: [{ scale: isSelected ? 1.15 : 1 }],
                    },
                  ]}
                  onPress={() => handleActionPress(action.id)}
                  onPressIn={() => setSelectedAction(action.id)}
                  onPressOut={() => setSelectedAction(null)}
                >
                  <Ionicons name={action.icon as any} size={24} color="white" />
                  
                  {/* Ripple effect for selected state */}
                  {isSelected && (
                    <Animated.View style={[styles.rippleEffect, { backgroundColor: action.color + '40' }]} />
                  )}
                </Pressable>
                
                {/* Enhanced label */}
                <Animated.View
                  style={[
                    styles.actionLabel,
                    {
                      backgroundColor: theme.colors.card,
                      opacity: scale,
                      transform: [{ scale: isSelected ? 1.1 : 1 }],
                    },
                  ]}
                >
                  <Text style={[styles.actionLabelText, { color: theme.colors.text }]}>
                    {action.label}
                  </Text>
                </Animated.View>
              </Animated.View>
            );
          })}
          
          {/* Enhanced Settings button */}
          {(() => {
            const settingsIndex = actions.length;
            const position = getActionPosition(settingsIndex, allActionsCount);
            const isSelected = selectedAction === 'settings';
            const scale = actionAnimations['settings'] || new Animated.Value(0);
            const settingsColor = theme.colors.textSecondary;
            
            return (
              <Animated.View
                key="settings"
                style={[
                  styles.actionButton,
                  {
                    transform: [
                      { translateX: position.x },
                      { translateY: position.y },
                      { scale: scale },
                    ],
                    opacity: scale,
                  },
                ]}
              >
                <Pressable
                  style={[
                    styles.actionPressable,
                    styles.settingsButton,
                    {
                      backgroundColor: settingsColor,
                      borderColor: settingsColor,
                      transform: [{ scale: isSelected ? 1.15 : 1 }],
                    },
                  ]}
                  onPress={() => handleActionPress('settings')}
                  onPressIn={() => setSelectedAction('settings')}
                  onPressOut={() => setSelectedAction(null)}
                >
                  <Ionicons name="settings" size={24} color="white" />
                  
                  {isSelected && (
                    <Animated.View style={[styles.rippleEffect, { backgroundColor: settingsColor + '40' }]} />
                  )}
                </Pressable>
                
                <Animated.View
                  style={[
                    styles.actionLabel,
                    {
                      backgroundColor: theme.colors.card,
                      opacity: scale,
                      transform: [{ scale: isSelected ? 1.1 : 1 }],
                    },
                  ]}
                >
                  <Text style={[styles.actionLabelText, { color: theme.colors.text }]}>
                    Settings
                  </Text>
                </Animated.View>
              </Animated.View>
            );
          })()}
        </View>
      )}

      {/* Enhanced Main button */}
      <TouchableOpacity style={styles.buttonWrapper} onPress={handlePress} activeOpacity={0.8}>
        {/* Ripple background for main button */}
        <Animated.View
          style={[
            styles.rippleBackground,
            {
              backgroundColor: color + '20',
              transform: [{ scale: rippleScale }],
            },
          ]}
        />
        
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: color,
              transform: [
                { scale: scaleAnim },
                { rotate: rotation },
              ],
            },
          ]}
        >
          <Ionicons 
            name={isExpanded ? "close" : "apps"} 
            size={28} 
            color="white" 
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.labelContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>
            Quick
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    maxWidth: 90,
    zIndex: 1001,
    position: 'relative',
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: MAIN_BUTTON_SIZE,
    height: MAIN_BUTTON_SIZE,
    borderRadius: MAIN_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  labelContainer: {
    marginTop: 6,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
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
  connectionLinesContainer: {
    position: 'absolute',
    bottom: 120,
    left: SCREEN_WIDTH / 2,
    width: 0,
    height: 0,
    zIndex: 1001,
  },
  connectionLine: {
    position: 'absolute',
    width: ACTION_RADIUS * 0.6,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transformOrigin: 'left center',
    marginLeft: 10,
    marginTop: -1,
    borderRadius: 1,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 80, // Position above the button (tab bar height + some offset)
    left: '50%',
    marginLeft: -(ACTION_RADIUS), // Center the container
    width: ACTION_RADIUS * 2,
    height: ACTION_RADIUS * 2,
    zIndex: 1002,
  },
  actionButton: {
    position: 'absolute',
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    marginLeft: -ACTION_BUTTON_SIZE / 2,
    marginTop: -ACTION_BUTTON_SIZE / 2,
    top: ACTION_RADIUS, // Center vertically in the container
    left: ACTION_RADIUS, // Center horizontally in the container
  },
  actionPressable: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: ACTION_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  settingsButton: {
    backgroundColor: '#8E8E93',
  },
  rippleEffect: {
    position: 'absolute',
    width: ACTION_BUTTON_SIZE * 2,
    height: ACTION_BUTTON_SIZE * 2,
    borderRadius: ACTION_BUTTON_SIZE,
    top: -ACTION_BUTTON_SIZE / 2,
    left: -ACTION_BUTTON_SIZE / 2,
    zIndex: -1,
  },
  actionLabel: {
    position: 'absolute',
    bottom: -45,
    left: -30,
    right: -30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionLabelText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  rippleBackground: {
    position: 'absolute',
    width: MAIN_BUTTON_SIZE * 3,
    height: MAIN_BUTTON_SIZE * 3,
    borderRadius: (MAIN_BUTTON_SIZE * 3) / 2,
    top: -(MAIN_BUTTON_SIZE * 3 - MAIN_BUTTON_SIZE) / 2,
    left: -(MAIN_BUTTON_SIZE * 3 - MAIN_BUTTON_SIZE) / 2,
    zIndex: -1,
  },
});

export default QuickActionMenuButton;