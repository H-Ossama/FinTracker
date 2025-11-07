import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useQuickActions } from '../contexts/QuickActionsContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAIN_BUTTON_SIZE = 56;
const ACTION_BUTTON_SIZE = 50;
const ACTION_RADIUS = 100; // Radius for circular menu

interface QuickActionMenuButtonProps {
  color?: string;
}

const QuickActionMenuButton: React.FC<QuickActionMenuButtonProps> = ({
  color = '#007AFF',
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const quickActions = useQuickActions();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values for each action button
  const actionAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Quick actions data
  const actions = [
    {
      id: 'addExpense',
      icon: 'remove-circle',
      label: 'Expense',
      color: '#FF6B6B',
      action: 'addExpense',
    },
    {
      id: 'addIncome',
      icon: 'add-circle',
      label: 'Income',
      color: '#4ECDC4',
      action: 'addIncome',
    },
    {
      id: 'transfer',
      icon: 'swap-horizontal',
      label: 'Transfer',
      color: '#45B7D1',
      action: 'transfer',
    },
    {
      id: 'addWallet',
      icon: 'wallet',
      label: 'Wallet',
      color: '#9C88FF',
      action: 'addWallet',
    },
  ];

  const handlePress = () => {
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const openMenu = () => {
    setIsExpanded(true);
    
    // Animate main button
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        useNativeDriver: true,
        tension: 100,
        friction: 5,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate action buttons with stagger
    actionAnimations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        delay: index * 50,
        useNativeDriver: true,
        tension: 40,
        friction: 5,
      }).start();
    });
  };

  const closeMenu = () => {
    setIsExpanded(false);
    
    // Animate main button
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide action buttons
    actionAnimations.forEach((anim) => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleActionPress = (action: string) => {
    closeMenu();
    
    setTimeout(() => {
      switch (action) {
        case 'addExpense':
          quickActions.triggerAddExpense();
          break;
        case 'addIncome':
          navigation.navigate('AddIncome' as never);
          break;
        case 'transfer':
          quickActions.triggerTransfer();
          break;
        case 'addWallet':
          quickActions.triggerAddWallet();
          break;
      }
    }, 100);
  };

  const getActionPosition = (index: number) => {
    // Arrange actions in a circle around the main button
    const angle = (index * (2 * Math.PI)) / actions.length - Math.PI / 2; // Start from top
    return {
      x: Math.cos(angle) * ACTION_RADIUS,
      y: Math.sin(angle) * ACTION_RADIUS,
    };
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* Circular Menu Modal */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalOverlay}>
          {/* Dark overlay with blur effect */}
          <Animated.View
            style={[
              styles.darkOverlay,
              {
                opacity: opacityAnim,
              },
            ]}
          />
          
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeMenu}
            activeOpacity={1}
          />
          
          {/* Circular Action Menu */}
          <View style={styles.circularMenu}>
            {actions.map((action, index) => {
              const position = getActionPosition(index);
              const scale = actionAnimations[index];
              
              return (
                <Animated.View
                  key={action.id}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: action.color,
                      transform: [
                        { translateX: position.x },
                        { translateY: position.y },
                        { scale: scale },
                      ],
                      opacity: scale,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.actionButtonTouchable}
                    onPress={() => handleActionPress(action.action)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={action.icon as any} size={24} color="white" />
                  </TouchableOpacity>
                  
                  {/* Action Label */}
                  <Animated.View
                    style={[
                      styles.actionLabel,
                      {
                        backgroundColor: action.color,
                        opacity: scale,
                      },
                    ]}
                  >
                    <Text style={styles.actionLabelText}>{action.label}</Text>
                  </Animated.View>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Main Button */}
      <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.8}>
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
        
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Quick
        </Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
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
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  circularMenu: {
    width: 0,
    height: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    position: 'absolute',
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: ACTION_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  actionButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ACTION_BUTTON_SIZE / 2,
  },
  actionLabel: {
    position: 'absolute',
    bottom: -35,
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
  actionLabelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default QuickActionMenuButton;