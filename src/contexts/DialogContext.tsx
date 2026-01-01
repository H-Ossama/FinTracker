import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import CustomAlert from '../components/CustomAlert';

export type DialogButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type DialogOptions = {
  title: string;
  message?: string;
  buttons?: DialogButton[];
  icon?: string;
  iconColor?: string;
};

type DialogState = DialogOptions & { visible: boolean };

export type DialogContextType = {
  show: (options: DialogOptions) => void;
  hide: () => void;

  alert: (title: string, message?: string, buttonText?: string) => void;
  success: (title: string, message?: string, onPress?: () => void) => void;
  error: (title: string, message?: string, onPress?: () => void) => void;
  warning: (title: string, message?: string, onPress?: () => void) => void;

  confirm: (options: {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
};

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = (): DialogContextType => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return ctx;
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DialogState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: undefined,
    icon: undefined,
    iconColor: undefined,
  });

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const show = useCallback((options: DialogOptions) => {
    setState({
      visible: true,
      title: options.title,
      message: options.message,
      buttons: options.buttons,
      icon: options.icon,
      iconColor: options.iconColor,
    });
  }, []);

  const alert = useCallback(
    (title: string, message?: string, buttonText: string = 'OK') => {
      show({
        title,
        message,
        buttons: [{ text: buttonText, style: 'default' }],
      });
    },
    [show]
  );

  const success = useCallback(
    (title: string, message?: string, onPress?: () => void) => {
      show({
        title,
        message,
        icon: 'checkmark-circle',
        iconColor: '#22C55E',
        buttons: [{ text: 'OK', onPress, style: 'default' }],
      });
    },
    [show]
  );

  const error = useCallback(
    (title: string, message?: string, onPress?: () => void) => {
      show({
        title,
        message,
        icon: 'alert-circle',
        iconColor: '#EF4444',
        buttons: [{ text: 'OK', onPress, style: 'default' }],
      });
    },
    [show]
  );

  const warning = useCallback(
    (title: string, message?: string, onPress?: () => void) => {
      show({
        title,
        message,
        icon: 'warning',
        iconColor: '#F59E0B',
        buttons: [{ text: 'OK', onPress, style: 'default' }],
      });
    },
    [show]
  );

  const confirm = useCallback(
    (options: {
      title: string;
      message?: string;
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
      onConfirm?: () => void;
      onCancel?: () => void;
    }) => {
      const confirmText = options.confirmText ?? (options.destructive ? 'Delete' : 'Confirm');
      const cancelText = options.cancelText ?? 'Cancel';

      show({
        title: options.title,
        message: options.message,
        icon: options.destructive ? 'trash' : 'help-circle',
        iconColor: options.destructive ? '#EF4444' : '#3B82F6',
        buttons: [
          { text: cancelText, onPress: options.onCancel, style: 'cancel' },
          {
            text: confirmText,
            onPress: options.onConfirm,
            style: options.destructive ? 'destructive' : 'default',
          },
        ],
      });
    },
    [show]
  );

  const value = useMemo<DialogContextType>(
    () => ({
      show,
      hide,
      alert,
      success,
      error,
      warning,
      confirm,
    }),
    [alert, confirm, error, hide, show, success, warning]
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      <CustomAlert
        visible={state.visible}
        title={state.title}
        message={state.message}
        buttons={state.buttons}
        icon={state.icon as any}
        iconColor={state.iconColor}
        onDismiss={hide}
      />
    </DialogContext.Provider>
  );
};

export default DialogContext;
