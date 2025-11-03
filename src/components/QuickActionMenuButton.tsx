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
  StatusBar,
  Vibration,
  GestureResponderEvent,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useQuickActions } from '../contexts/QuickActionsContext';
import { quickActionsService, QuickAction } from '../services/quickActionsService';

// Import haptics with proper fallback
let Haptics: any;
try {
  Haptics = require('expo-haptics');
} catch (error) {
  console.warn('expo-haptics not available');
  Haptics = {
    impactAsync: () => Promise.resolve(),
    selectionAsync: () => Promise.resolve(),
    ImpactFeedbackStyle: {
      Light: 'light',
      Medium: 'medium',
      Heavy: 'heavy'
    }
  };
}

// Advanced haptic feedback function with different patterns
const triggerHaptic = (type: 'open' | 'close' | 'select' | 'hover') => {
  if (Platform.OS === 'android') {
    // Custom vibration patterns for different actions
    const patterns = {
      open: [0, 50, 30, 80], // Double tap pattern for opening
      close: [0, 30], // Single short vibration for closing
      select: [0, 80, 50, 120], // Strong double vibration for selection
      hover: [0, 25] // Very light vibration for hover
    };
    
    try {
      if (Vibration && typeof Vibration.vibrate === 'function') {
        Vibration.vibrate(patterns[type]);
      }
    } catch (error) {
      // Silent fail
    }
  } else {
    // Use expo-haptics for iOS with appropriate feedback types
    try {
      const feedbackMap = {
        open: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 100);
        },
        close: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        select: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 80);
        },
        hover: () => Haptics.selectionAsync()
      };
      
      feedbackMap[type]();
    } catch (error) {
      // Silent fail
    }
  }
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
const TOTAL_HEIGHT = SCREEN_HEIGHT + STATUS_BAR_HEIGHT;
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

  const handleOverlayPress = () => {
    if (isExpanded) {
      closeMenu();
    }
  };

  const openMenu = () => {
    setIsExpanded(true);
    
    // Haptic feedback for menu opening
    triggerHaptic('open');
    
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
    const allActions = [...actions, { id: 'settings', label: 'Customise Quick Action', icon: 'settings', color: '#8E8E93' }];
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
    
    // Haptic feedback for menu closing
    triggerHaptic('close');
    
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
    // Haptic feedback for action selection
    triggerHaptic('select');
    
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
    <>
      {/* Modal overlay - completely blocks all background interactions */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="none"
        onRequestClose={handleOverlayPress}
        supportedOrientations={['portrait', 'landscape']}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: overlayOpacity,
            },
          ]}
        >
          {/* Dark tint to dim background */}
          <Animated.View 
            style={[
              styles.dimOverlay,
              { opacity: 1 } // Make completely opaque to hide background elements
            ]} 
          />
          
          {/* Touch blocker - captures all touch events */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleOverlayPress}
            activeOpacity={1}
          />
          
          {/* Action buttons positioned in modal */}
          <View style={styles.modalActionsContainer} pointerEvents="box-none">
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
                    onPressIn={() => {
                      setSelectedAction(action.id);
                      triggerHaptic('hover');
                    }}
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
                    onPressIn={() => {
                      setSelectedAction('settings');
                      triggerHaptic('hover');
                    }}
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
                    <Text style={[styles.actionLabelText, { color: theme.colors.text }]} numberOfLines={2}>
                      Customise Quick Action
                    </Text>
                  </Animated.View>
                </Animated.View>
              );
            })()}
          </View>
        </Animated.View>
      </Modal>

      <View style={styles.container}>

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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    maxWidth: 90,
    zIndex: 1004, // Highest z-index to ensure main button stays interactive
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
      height: 10,
    },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
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
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    width: SCREEN_WIDTH + 2000,
    height: SCREEN_HEIGHT + 2000,
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionsContainer: {
    position: 'absolute',
    bottom: 80, // Position above the button (tab bar height + some offset)
    left: '50%',
    marginLeft: -(ACTION_RADIUS), // Center the container
    width: ACTION_RADIUS * 2,
    height: ACTION_RADIUS * 2,
    zIndex: 1003, // Higher than overlay to ensure interactions work
  },
  touchBlocker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
    backgroundColor: 'transparent',
  },
  dimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
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
    bottom: -42,
    left: -35,
    right: -35,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    maxWidth: 120,
    alignSelf: 'center',
  },
  actionLabelText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 12,
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