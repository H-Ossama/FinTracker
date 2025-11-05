import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useQuickActions } from '../contexts/QuickActionsContext';

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
  const [isExpanded, setIsExpanded] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const openMenu = () => {
    setIsExpanded(true);
    
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
    ]).start();
  };

  const closeMenu = () => {
    setIsExpanded(false);
    
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
    ]).start();
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

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* Simplified Modal */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeMenu}
            activeOpacity={1}
          />
          
          <View style={styles.actionMenu}>
            <TouchableOpacity
              style={[styles.actionItem, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleActionPress('addExpense')}
            >
              <Ionicons name="remove-circle" size={24} color="white" />
              <Text style={styles.actionText}>Expense</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionItem, { backgroundColor: '#2196F3' }]}
              onPress={() => handleActionPress('addIncome')}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.actionText}>Income</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionItem, { backgroundColor: '#FF9800' }]}
              onPress={() => handleActionPress('transfer')}
            >
              <Ionicons name="swap-horizontal" size={24} color="white" />
              <Text style={styles.actionText}>Transfer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionItem, { backgroundColor: '#9C27B0' }]}
              onPress={() => handleActionPress('addWallet')}
            >
              <Ionicons name="wallet" size={24} color="white" />
              <Text style={styles.actionText}>Wallet</Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});

export default QuickActionMenuButton;