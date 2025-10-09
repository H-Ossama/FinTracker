import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLocalization } from '../contexts/LocalizationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

interface PinSetupScreenProps {
  mode: 'setup' | 'change';
}

const PinSetupScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLocalization();
  
  const mode = (route.params as any)?.mode || 'setup';
  
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>(mode === 'change' ? 'current' : 'new');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  
  const pinInputRef = useRef<TextInput>(null);
  
  const styles = createStyles(theme);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricEnabled(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricEnabled(false);
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    // Simple hash function for PIN storage
    // In production, use a proper crypto library like expo-crypto
    const salt = 'fintracker_salt_2024';
    let hash = 0;
    const str = pin + salt;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  };

  const validateCurrentPin = async (pin: string): Promise<boolean> => {
    try {
      const storedPin = await AsyncStorage.getItem('app_pin_hash');
      if (!storedPin) return false;
      
      const hashedPin = await hashPin(pin);
      return hashedPin === storedPin;
    } catch (error) {
      console.error('Error validating PIN:', error);
      return false;
    }
  };

  const savePin = async (pin: string): Promise<void> => {
    try {
      const hashedPin = await hashPin(pin);
      await AsyncStorage.setItem('app_pin_hash', hashedPin);
    } catch (error) {
      console.error('Error saving PIN:', error);
      throw error;
    }
  };

  const handlePinInput = (pin: string) => {
    setError('');
    
    if (pin.length !== 4) {
      return;
    }

    if (step === 'current') {
      handleCurrentPinSubmit(pin);
    } else if (step === 'new') {
      handleNewPinSubmit(pin);
    } else if (step === 'confirm') {
      handleConfirmPinSubmit(pin);
    }
  };

  const handleCurrentPinSubmit = async (pin: string) => {
    setIsLoading(true);
    setCurrentPin(pin);
    
    try {
      const isValid = await validateCurrentPin(pin);
      
      if (isValid) {
        setStep('new');
        clearInputs();
      } else {
        setError(t('pinSetup.incorrectPin'));
        Vibration.vibrate(500);
        clearInputs();
      }
    } catch (error) {
      setError(t('error'));
      clearInputs();
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPinSubmit = (pin: string) => {
    setNewPin(pin);
    setStep('confirm');
    clearInputs();
  };

  const handleConfirmPinSubmit = async (pin: string) => {
    setConfirmPin(pin);
    
    if (pin !== newPin) {
      setError(t('pinSetup.pinMismatch'));
      Vibration.vibrate(500);
      setStep('new');
      setNewPin('');
      clearInputs();
      return;
    }

    setIsLoading(true);
    
    try {
      await savePin(pin);
      
      // Update app lock settings
      const appLockSettings = await AsyncStorage.getItem('appLockSettings');
      if (appLockSettings) {
        const settings = JSON.parse(appLockSettings);
        settings.hasPinSet = true;
        await AsyncStorage.setItem('appLockSettings', JSON.stringify(settings));
      }
      
      Alert.alert(
        mode === 'change' ? t('success') : t('pinSetup.setupComplete'),
        mode === 'change' ? t('pinSetup.pinChanged') : t('pinSetup.setupSuccess'),
        [
          {
            text: t('ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      setError(t('error'));
      clearInputs();
    } finally {
      setIsLoading(false);
    }
  };

  const clearInputs = () => {
    if (pinInputRef.current) {
      pinInputRef.current.clear();
    }
  };

  const handleGoBack = () => {
    if (step === 'confirm' && mode === 'setup') {
      setStep('new');
      setNewPin('');
      clearInputs();
    } else if (step === 'new' && mode === 'change') {
      setStep('current');
      setCurrentPin('');
      clearInputs();
    } else {
      navigation.goBack();
    }
  };

  const getTitle = () => {
    if (mode === 'change') {
      return t('pinSetup.changeTitle');
    }
    return t('pinSetup.title');
  };

  const getSubtitle = () => {
    if (mode === 'change') {
      return t('pinSetup.changeSubtitle');
    }
    return t('pinSetup.subtitle');
  };

  const getPromptText = () => {
    switch (step) {
      case 'current':
        return t('pinSetup.currentPin');
      case 'new':
        return mode === 'change' ? t('pinSetup.newPin') : t('pinSetup.enterPin');
      case 'confirm':
        return mode === 'change' ? t('pinSetup.confirmNewPin') : t('pinSetup.confirmPin');
      default:
        return t('pinSetup.enterPin');
    }
  };

  const PinDots = ({ pin }: { pin: string }) => (
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

  const NumberPad = () => {
    const [inputPin, setInputPin] = useState('');

    const handleNumberPress = (number: string) => {
      if (inputPin.length < 4) {
        const newPin = inputPin + number;
        setInputPin(newPin);
        handlePinInput(newPin);
      }
    };

    const handleBackspace = () => {
      const newPin = inputPin.slice(0, -1);
      setInputPin(newPin);
      setError('');
    };

    const clearPin = () => {
      setInputPin('');
      setError('');
    };

    const handleBiometric = async () => {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t('lockScreen.biometricPrompt'),
          fallbackLabel: t('lockScreen.usePinInstead'),
          cancelLabel: t('cancel'),
        });

        if (result.success) {
          navigation.goBack();
        }
      } catch (error) {
        console.error('Biometric authentication error:', error);
      }
    };

    // Clear input when step changes
    React.useEffect(() => {
      clearPin();
    }, [step]);

    return (
      <View style={styles.numberPadContainer}>
        <PinDots pin={inputPin} />
        
        {error ? (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        ) : null}

        <View style={styles.numberPad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
            <TouchableOpacity
              key={number}
              style={[styles.numberButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleNumberPress(number.toString())}
              disabled={isLoading}
            >
              <Text style={[styles.numberButtonText, { color: theme.colors.text }]}>
                {number}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* Biometric button (left of 0) */}
          {biometricEnabled ? (
            <TouchableOpacity
              style={[styles.numberButton, { backgroundColor: theme.colors.surface }]}
              onPress={handleBiometric}
              disabled={isLoading}
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
            style={[styles.numberButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleNumberPress('0')}
            disabled={isLoading}
          >
            <Text style={[styles.numberButtonText, { color: theme.colors.text }]}>0</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.numberButton}
            onPress={handleBackspace}
            disabled={isLoading || inputPin.length === 0}
          >
            <Ionicons
              name="backspace-outline"
              size={24}
              color={inputPin.length === 0 ? theme.colors.textSecondary : theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>{getTitle()}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Ionicons 
              name="shield-checkmark" 
              size={60} 
              color={theme.colors.primary} 
              style={styles.icon}
            />
            
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {getSubtitle()}
            </Text>
            
            <Text style={[styles.promptText, { color: theme.colors.text }]}>
              {getPromptText()}
            </Text>
          </View>

          <NumberPad />
          
          {/* Hidden TextInput for accessibility */}
          <TextInput
            ref={pinInputRef}
            style={styles.hiddenInput}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            autoFocus={Platform.OS === 'ios'}
            editable={false}
          />
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surface + '80',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    headerSection: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    icon: {
      marginBottom: 20,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 30,
      lineHeight: 24,
    },
    promptText: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 20,
    },
    numberPadContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
    errorText: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 20,
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
    hiddenInput: {
      position: 'absolute',
      left: -1000,
      opacity: 0,
    },
  });

export default PinSetupScreen;