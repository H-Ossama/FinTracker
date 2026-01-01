import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { DEV_PIN, DEV_PIN_LENGTH } from '../constants/devPin';

const PIN_LENGTH = DEV_PIN_LENGTH;
const MAX_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 30;

const DevPINScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [enteredPIN, setEnteredPIN] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockEndTime, setLockEndTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHintModal, setShowHintModal] = useState(false);
  const [success, setSuccess] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isLocked = useMemo(() => {
    if (!lockEndTime) return false;
    return Date.now() < lockEndTime;
  }, [lockEndTime]);

  const remainingCooldown = useMemo(() => {
    if (!lockEndTime) return 0;
    const msLeft = lockEndTime - Date.now();
    return msLeft > 0 ? Math.ceil(msLeft / 1000) : 0;
  }, [lockEndTime]);

  useEffect(() => {
    if (isLocked) {
      cooldownIntervalRef.current = setInterval(() => {
        if (Date.now() >= (lockEndTime || 0)) {
          clearInterval(cooldownIntervalRef.current as NodeJS.Timeout);
          setLockEndTime(null);
          setAttempts(0);
          setError(null);
          setEnteredPIN('');
        } else {
          setLockEndTime((current) => current);
        }
      }, 1000);
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [isLocked, lockEndTime]);

  const runShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDigitPress = useCallback(
    (digit: string) => {
      if (isLocked || success) return;
      if (enteredPIN.length >= PIN_LENGTH) return;

      Haptics.selectionAsync().catch(() => {});
      const nextPIN = `${enteredPIN}${digit}`;
      setEnteredPIN(nextPIN);
      setError(null);

      if (nextPIN.length === PIN_LENGTH) {
        validatePIN(nextPIN);
      }
    },
    [enteredPIN, isLocked, success],
  );

  const handleBackspace = useCallback(() => {
    if (isLocked || success) return;
    if (!enteredPIN.length) return;
    Haptics.selectionAsync().catch(() => {});
    setEnteredPIN((prev) => prev.slice(0, -1));
    setError(null);
  }, [enteredPIN, isLocked, success]);

  const handleConfirm = useCallback(() => {
    if (isLocked || success) return;
    if (enteredPIN.length < PIN_LENGTH) {
      setError(`Enter all ${PIN_LENGTH} digits`);
      return;
    }
    validatePIN(enteredPIN);
  }, [enteredPIN, isLocked, success]);

  const handleForgotPin = useCallback(() => {
    setShowHintModal(true);
  }, []);

  const validatePIN = useCallback(
    (pin: string) => {
      if (pin === DEV_PIN) {
        setSuccess(true);
        setError(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setTimeout(() => {
          navigation.replace('DevelopmentTools' as never);
        }, 300);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      runShake();
      setEnteredPIN('');
      setAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) {
          setLockEndTime(Date.now() + COOLDOWN_SECONDS * 1000);
          setError(`Too many attempts. Try again in ${COOLDOWN_SECONDS}s`);
        } else {
          setError('Incorrect PIN. Please try again.');
        }
        return next;
      });
    },
    [navigation, runShake],
  );

  const keypadRows = useMemo(
    () => [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['back', '0', 'confirm'],
    ],
    [],
  );

  const renderDot = (filled: boolean, index: number) => (
    <View
      key={index}
      style={[
        styles.dot,
        {
          backgroundColor: filled ? theme.colors.primary : 'transparent',
          borderColor: filled ? theme.colors.primary : theme.colors.border,
        },
      ]}
    />
  );

  const renderKey = (key: string) => {
    const disabled = isLocked || success;

    const content = () => {
      if (key === 'back') return <Ionicons name="backspace-outline" size={24} color={theme.colors.text} />;
      if (key === 'confirm') return <Ionicons name="checkmark" size={26} color={theme.colors.text} />;
      return <Text style={[styles.keyText, { color: theme.colors.text }]}>{key}</Text>;
    };

    const onPress = () => {
      if (key === 'back') return handleBackspace();
      if (key === 'confirm') return handleConfirm();
      return handleDigitPress(key);
    };

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.key,
          {
            backgroundColor: key === 'confirm' ? theme.colors.surface : (isDark ? '#1F1F23' : '#F6F6F6'),
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        activeOpacity={0.8}
        disabled={disabled}
        onPress={onPress}
      >
        {content()}
      </TouchableOpacity>
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Developer Access</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Enter your PIN to continue</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={48} color={theme.colors.primary} />
      </View>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => renderDot(index < enteredPIN.length, index))}
      </Animated.View>

      {error ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      ) : (
        <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
          PIN is 8 digits. Attempts left: {Math.max(0, MAX_ATTEMPTS - attempts)}
        </Text>
      )}

      {isLocked ? (
        <Text style={[styles.cooldownText, { color: theme.colors.textSecondary }]}>
          Too many attempts. Try again in {remainingCooldown}s
        </Text>
      ) : null}

      <View style={styles.keypad}>
        {keypadRows.map((row) => (
          <View key={row.join('-')} style={styles.keyRow}>
            {row.map((key) => renderKey(key))}
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={handleForgotPin} style={styles.forgotButton} disabled={isLocked}>
        <Text style={[styles.forgotText, { color: theme.colors.primary }]}>Forgot PIN?</Text>
      </TouchableOpacity>

      <Modal
        visible={showHintModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHintModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="bulb" size={48} color="#F59E0B" style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>PIN Hint</Text>
            <View style={[styles.modalDivider, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>
              "The day the developer's brother was born"
            </Text>
            <View style={[styles.modalDivider, { backgroundColor: theme.colors.border }]} />
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowHintModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 32,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    headerTextWrap: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
    },
    headerSubtitle: {
      fontSize: 14,
      marginTop: 4,
    },
    headerSpacer: {
      width: 40,
      height: 40,
    },
    iconWrap: {
      alignItems: 'center',
      marginBottom: 16,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 12,
      gap: 10,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
    },
    errorText: {
      textAlign: 'center',
      fontSize: 14,
      marginBottom: 8,
    },
    helperText: {
      textAlign: 'center',
      fontSize: 14,
      marginBottom: 4,
    },
    cooldownText: {
      textAlign: 'center',
      fontSize: 14,
      marginBottom: 8,
    },
    keypad: {
      marginTop: 8,
      marginBottom: 24,
      gap: 12,
    },
    keyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    key: {
      flex: 1,
      height: 72,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyText: {
      fontSize: 26,
      fontWeight: '700',
    },
    forgotButton: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    forgotText: {
      fontSize: 16,
      textDecorationLine: 'underline',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      width: '100%',
      maxWidth: 320,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 20,
    },
    modalIcon: {
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 16,
    },
    modalDivider: {
      width: '100%',
      height: 1,
      marginVertical: 16,
    },
    modalMessage: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      fontStyle: 'italic',
    },
    modalButton: {
      paddingVertical: 14,
      paddingHorizontal: 48,
      borderRadius: 12,
    },
    modalButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default DevPINScreen;
