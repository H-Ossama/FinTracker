import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BACKEND_URL = 'https://finex-production.up.railway.app';

const getDevHostFromExpo = (): string | null => {
  const hostUri: unknown =
    (Constants as any)?.expoConfig?.hostUri ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ??
    (Constants as any)?.manifest?.debuggerHost ??
    (Constants as any)?.expoGoConfig?.debuggerHost;

  if (typeof hostUri !== 'string') return null;
  const trimmed = hostUri.trim();
  if (!trimmed) return null;

  return trimmed.split(':')[0] || null;
};

const getDefaultDevBackendUrl = (): string => {
  const host = getDevHostFromExpo();

  if (host) {
    return `http://${host}:3001`;
  }

  // Sensible fallbacks when Expo hostUri is unavailable.
  if (Platform.OS === 'android') {
    // Android emulator -> host machine.
    return 'http://10.0.2.2:3001';
  }

  return 'http://localhost:3001';
};

export const getBackendApiBaseUrl = (): string => {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
  const baseUrl = configuredBaseUrl || (__DEV__ ? getDefaultDevBackendUrl() : DEFAULT_BACKEND_URL);

  return baseUrl.replace(/\/$/, '');
};

export const getBackendApiRoot = (): string => {
  const baseUrl = getBackendApiBaseUrl();
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

export const getBackendAuthUrl = (): string => `${getBackendApiRoot()}/auth`;

export const getBackendUsersUrl = (): string => `${getBackendApiRoot()}/users`;
