import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  AppState,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocalization } from '../contexts/LocalizationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

interface AppLockScreenProps {
  onUnlock: () => void;
}

const AppLockScreen: React.FC<AppLockScreenProps> = ({ onUnlock }) => {
  const { theme } = useTheme();
  const { biometricEnabled } = useAuth();
  const { t } = useLocalization();
  
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [showBiometric, setShowBiometric] = useState(true);
  const [hasPinSet, setHasPinSet] = useState(false);
  
  const maxAttempts = 5;
  const lockDuration = 30000; // 30 seconds
  
  const styles = createStyles(theme);
  
  useEffect(() => {
    checkAppLockSettings();
    if (biometricEnabled && showBiometric) {
      promptBiometric();
    }
  }, []);

  useEffect(() => {
    if (lockUntil) {
      const timer = setInterval(() => {
        if (Date.now() >= lockUntil) {
          setIsLocked(false);
          setLockUntil(null);
          setAttempts(0);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [lockUntil]);

  const checkAppLockSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('appLockSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setHasPinSet(parsedSettings.hasPinSet || false);
      }
    } catch (error) {
      console.error('Error checking app lock settings:', error);
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    const salt = 'fintracker_salt_2024';
    let hash = 0;
    const str = pin + salt;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  const validatePin = async (inputPin: string): Promise<boolean> => {
    try {
      const storedPin = await AsyncStorage.getItem('app_pin_hash');
      if (!storedPin) return false;
      
      const hashedPin = await hashPin(inputPin);
      return hashedPin === storedPin;
    } catch (error) {
      console.error('Error validating PIN:', error);
      return false;
    }
  };

  const promptBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lockScreen.biometricPrompt'),
        fallbackLabel: t('lockScreen.usePinInstead'),
        cancelLabel: t('cancel'),
      });

      if (result.success) {
        onUnlock();
      } else {
        setShowBiometric(false);
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      setShowBiometric(false);
    }
  };

  const handlePinInput = async (inputPin: string) => {
    if (isLocked) return;
    
    if (inputPin.length === 4) {
      const isValid = await validatePin(inputPin);
      
      if (isValid) {
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');
        Vibration.vibrate(500);
        
        if (newAttempts >= maxAttempts) {
          setIsLocked(true);
          setLockUntil(Date.now() + lockDuration);
          Alert.alert(
            t('lockScreen.tooManyAttempts'),
            t('lockScreen.lockedTemporarily')
          );
        } else {
          const remainingAttempts = maxAttempts - newAttempts;
          Alert.alert(
            t('lockScreen.invalidPin'),
            t('lockScreen.attemptsRemaining', { attempts: remainingAttempts })
          );
        }
      }
    }
  };

  const handleNumberPress = (number: string) => {
    if (isLocked || pin.length >= 4) return;
    
    const newPin = pin + number;
    setPin(newPin);
    handlePinInput(newPin);
  };

  const handleBackspace = () => {
    if (isLocked) return;
    setPin(pin.slice(0, -1));
  };

  const PinDots = () => (
    <View style={styles.pinDotsContainer}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[
            styles.pinDot,
            {
              backgroundColor: pin.length > index ? theme.colors.primary : theme.colors.border,
            },
          ]}
        />
      ))}
    </View>
  );

  const NumberPad = () => (
    <View style={styles.numberPad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
        <TouchableOpacity
          key={number}
          style={[
            styles.numberButton, 
            { 
              backgroundColor: theme.colors.surface,
              opacity: isLocked ? 0.5 : 1,
            }
          ]}
          onPress={() => handleNumberPress(number.toString())}
          disabled={isLocked}
        >
          <Text style={[styles.numberButtonText, { color: theme.colors.text }]}>
            {number}
          </Text>
        </TouchableOpacity>
      ))}
      
      {/* Biometric button (left of 0) */}
      {biometricEnabled ? (
        <TouchableOpacity
          style={[
            styles.numberButton,
            { 
              backgroundColor: theme.colors.surface,
              opacity: isLocked ? 0.5 : 1,
            }
          ]}
          onPress={promptBiometric}
          disabled={isLocked}
        >
          <Ionicons
            name="finger-print"
            size={28}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.numberButton} />
      )}
      
      <TouchableOpacity
        style={[
          styles.numberButton, 
          { 
            backgroundColor: theme.colors.surface,
            opacity: isLocked ? 0.5 : 1,
          }
        ]}
        onPress={() => handleNumberPress('0')}
        disabled={isLocked}
      >
        <Text style={[styles.numberButtonText, { color: theme.colors.text }]}>0</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.numberButton, { opacity: isLocked || pin.length === 0 ? 0.5 : 1 }]}
        onPress={handleBackspace}
        disabled={isLocked || pin.length === 0}
      >
        <Ionicons
          name="backspace-outline"
          size={24}
          color={theme.colors.text}
        />
      </TouchableOpacity>
    </View>
  );

  const formatLockTime = () => {
    if (!lockUntil) return '';
    const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
    return `${remaining}s`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons 
              name="shield-checkmark" 
              size={80} 
              color={theme.colors.primary} 
            />
            
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('lockScreen.title')}
            </Text>
            
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {hasPinSet ? t('lockScreen.subtitle') : t('lockScreen.biometricPrompt')}
            </Text>
          </View>

          {/* PIN Input */}
          {hasPinSet && (
            <View style={styles.pinSection}>
              <PinDots />
              
              {isLocked && (
                <Text style={[styles.lockMessage, { color: theme.colors.error }]}>
                  {t('lockScreen.lockedTemporarily')} ({formatLockTime()})
                </Text>
              )}
              
              <NumberPad />
            </View>
          )}

          {/* Biometric-only option when no PIN is set */}
          {!hasPinSet && biometricEnabled && (
            <View style={styles.biometricOnlySection}>
              <TouchableOpacity
                style={[styles.biometricOnlyButton, { backgroundColor: theme.colors.primary }]}
                onPress={promptBiometric}
                disabled={isLocked}
              >
                <Ionicons name="finger-print" size={32} color="#FFFFFF" />
                <Text style={[styles.biometricOnlyText, { color: '#FFFFFF' }]}>
                  {t('lockScreen.useBiometric')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 50,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
    },
    pinSection: {
      alignItems: 'center',
      width: '100%',
    },
    pinDotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 40,
    },
    pinDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginHorizontal: 12,
    },
    lockMessage: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 30,
      fontWeight: '500',
    },
    numberPad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      maxWidth: 300,
    },
    numberButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      justifyContent: 'center',
      alignItems: 'center',
      margin: 10,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    numberButtonText: {
      fontSize: 24,
      fontWeight: '600',
    },
    biometricSection: {
      marginTop: 40,
      alignItems: 'center',
    },
    biometricButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    biometricText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 10,
    },
    biometricOnlySection: {
      alignItems: 'center',
      marginTop: 50,
    },
    biometricOnlyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 30,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 5,
    },
    biometricOnlyText: {
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 12,
    },
  });

export default AppLockScreen;