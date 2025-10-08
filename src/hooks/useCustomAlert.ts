import { useState, useCallback } from 'react';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  icon?: string;
  iconColor?: string;
}

interface AlertState extends AlertOptions {
  visible: boolean;
}

export const useCustomAlert = () => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      ...options,
      visible: true,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // Convenience methods for common alert types
  const showSuccess = useCallback((title: string, message?: string, onPress?: () => void) => {
    showAlert({
      title,
      message,
      icon: 'checkmark-circle',
      iconColor: '#4CAF50',
      buttons: [{ text: 'OK', onPress, style: 'default' }],
    });
  }, [showAlert]);

  const showError = useCallback((title: string, message?: string, onPress?: () => void) => {
    showAlert({
      title,
      message,
      icon: 'alert-circle',
      iconColor: '#F44336',
      buttons: [{ text: 'OK', onPress, style: 'default' }],
    });
  }, [showAlert]);

  const showWarning = useCallback((title: string, message?: string, onPress?: () => void) => {
    showAlert({
      title,
      message,
      icon: 'warning',
      iconColor: '#FF9800',
      buttons: [{ text: 'OK', onPress, style: 'default' }],
    });
  }, [showAlert]);

  const showConfirm = useCallback((
    title: string, 
    message?: string, 
    onConfirm?: () => void, 
    onCancel?: () => void
  ) => {
    showAlert({
      title,
      message,
      icon: 'help-circle',
      iconColor: '#2196F3',
      buttons: [
        { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm, style: 'default' },
      ],
    });
  }, [showAlert]);

  const showDestructive = useCallback((
    title: string, 
    message?: string, 
    onConfirm?: () => void, 
    onCancel?: () => void,
    confirmText: string = 'Delete'
  ) => {
    showAlert({
      title,
      message,
      icon: 'trash',
      iconColor: '#F44336',
      buttons: [
        { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        { text: confirmText, onPress: onConfirm, style: 'destructive' },
      ],
    });
  }, [showAlert]);

  return {
    alertState,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
    showDestructive,
  };
};