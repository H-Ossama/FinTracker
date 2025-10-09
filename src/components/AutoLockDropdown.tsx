import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

interface AutoLockDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

interface TimerOption {
  value: string;
  labelKey: string;
}

const AutoLockDropdown: React.FC<AutoLockDropdownProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const [isVisible, setIsVisible] = useState(false);

  const styles = createStyles(theme);

  const timerOptions: TimerOption[] = [
    { value: 'immediate', labelKey: 'appLock.immediately' },
    { value: '10sec', labelKey: 'appLock.tenSeconds' },
    { value: '30sec', labelKey: 'appLock.thirtySeconds' },
    { value: '1min', labelKey: 'appLock.oneMinute' },
    { value: '2min', labelKey: 'appLock.twoMinutes' },
    { value: '5min', labelKey: 'appLock.fiveMinutes' },
    { value: '10min', labelKey: 'appLock.tenMinutes' },
    { value: '15min', labelKey: 'appLock.fifteenMinutes' },
    { value: '30min', labelKey: 'appLock.thirtyMinutes' },
    { value: '1hour', labelKey: 'appLock.oneHour' },
    { value: 'never', labelKey: 'appLock.never' },
  ];

  const getSelectedLabel = (): string => {
    const option = timerOptions.find(opt => opt.value === value);
    return option ? t(option.labelKey) : t('appLock.fiveMinutes');
  };

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setIsVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dropdown,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            opacity: disabled ? 0.5 : 1,
          }
        ]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <Text style={[styles.dropdownText, { color: theme.colors.text }]}>
          {getSelectedLabel()}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={16} 
          color={disabled ? theme.colors.textSecondary : theme.colors.text} 
        />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t('appLock.timerOptions')}
              </Text>
              <TouchableOpacity
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {timerOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    {
                      backgroundColor: value === option.value ? theme.colors.primary + '20' : 'transparent',
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: index < timerOptions.length - 1 ? 1 : 0,
                    }
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text style={[
                    styles.optionText,
                    { 
                      color: value === option.value ? theme.colors.primary : theme.colors.text,
                      fontWeight: value === option.value ? '600' : '400',
                    }
                  ]}>
                    {t(option.labelKey)}
                  </Text>
                  {value === option.value && (
                    <Ionicons 
                      name="checkmark" 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      minWidth: 120,
    },
    dropdownText: {
      fontSize: 14,
      marginRight: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 320,
      maxHeight: '70%',
      borderRadius: 16,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    closeButton: {
      padding: 4,
    },
    optionsList: {
      maxHeight: 400,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    optionText: {
      fontSize: 16,
      flex: 1,
    },
  });

export default AutoLockDropdown;