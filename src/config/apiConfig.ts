const DEFAULT_BACKEND_URL = 'https://finex-production.up.railway.app';

export const getBackendApiBaseUrl = (): string => {
  const baseUrl =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    DEFAULT_BACKEND_URL;

  return baseUrl.replace(/\/$/, '');
};

export const getBackendApiRoot = (): string => {
  const baseUrl = getBackendApiBaseUrl();
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

export const getBackendAuthUrl = (): string => `${getBackendApiRoot()}/auth`;

export const getBackendUsersUrl = (): string => `${getBackendApiRoot()}/users`;
