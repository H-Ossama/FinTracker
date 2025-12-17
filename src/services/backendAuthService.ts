import { getBackendAuthUrl, getBackendUsersUrl } from '../config/apiConfig';

export interface BackendUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  language?: string;
  currency?: string;
  createdAt?: string;
  lastLogin?: string;
  emailVerified?: boolean;
}

export interface BackendAuthSuccess {
  success: true;
  user: BackendUser;
  token: string;
  status: number;
}

export interface BackendAuthError {
  success: false;
  error: string;
  status?: number;
  networkError?: boolean;
}

export type BackendAuthResult = BackendAuthSuccess | BackendAuthError;

export interface BackendSessionValidationResult {
  valid: boolean;
  error?: string;
  networkError?: boolean;
  status?: number;
}

const AUTH_URL = getBackendAuthUrl();
const USERS_URL = getBackendUsersUrl();

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    if (data?.error) {
      return typeof data.error === 'string' ? data.error : 'Request failed';
    }
    if (data?.message) {
      return typeof data.message === 'string' ? data.message : 'Request failed';
    }
    return `Request failed with status ${response.status}`;
  } catch (error) {
    return `Request failed with status ${response.status}`;
  }
};

const handleNetworkError = (error: unknown): BackendAuthError => {
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message || 'Network request failed',
      networkError: true,
    };
  }

  return {
    success: false,
    error: 'Network request failed',
    networkError: true,
  };
};

export const backendAuthService = {
  async register(params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    language?: string;
    currency?: string;
  }): Promise<BackendAuthResult> {
    try {
      const response = await fetch(`${AUTH_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        return {
          success: false,
          error: errorMessage,
          status: response.status,
        };
      }

      const data = await response.json();
      if (!data?.success || !data?.data?.user || !data?.data?.token) {
        return {
          success: false,
          error: 'Invalid response from server',
          status: response.status,
        };
      }

      return {
        success: true,
        user: data.data.user as BackendUser,
        token: data.data.token as string,
        status: response.status,
      };
    } catch (error) {
      return handleNetworkError(error);
    }
  },

  async login(params: { email: string; password: string }): Promise<BackendAuthResult> {
    try {
      console.log('🔐 Attempting backend login for:', params.email);
      console.log('📍 Backend URL:', AUTH_URL);
      
      const response = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        console.error('❌ Backend login failed with status', response.status, ':', errorMessage);
        return {
          success: false,
          error: errorMessage,
          status: response.status,
        };
      }

      const data = await response.json();
      if (!data?.success || !data?.data?.user || !data?.data?.token) {
        console.error('❌ Invalid response format from backend:', data);
        return {
          success: false,
          error: 'Invalid response from server',
          status: response.status,
        };
      }

      console.log('✅ Backend login successful for:', params.email);
      return {
        success: true,
        user: data.data.user as BackendUser,
        token: data.data.token as string,
        status: response.status,
      };
    } catch (error) {
      console.error('🌐 Backend login network error:', error);
      return handleNetworkError(error);
    }
  },

  async logout(token: string | null | undefined): Promise<{
    success: boolean;
    error?: string;
    status?: number;
    networkError?: boolean;
  }> {
    if (!token) {
      return {
        success: false,
        error: 'Missing auth token',
      };
    }

    try {
      const response = await fetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        return {
          success: false,
          error: errorMessage,
          status: response.status,
        };
      }

      return {
        success: true,
        status: response.status,
      };
    } catch (error) {
      const networkError = handleNetworkError(error);
      return {
        success: false,
        error: networkError.error,
        networkError: true,
      };
    }
  },

  async validateSession(token: string | null | undefined): Promise<BackendSessionValidationResult> {
    if (!token) {
      return {
        valid: false,
        error: 'Missing auth token',
      };
    }

    try {
      const response = await fetch(`${USERS_URL}/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return { valid: true, status: response.status };
      }

      const errorMessage = await parseErrorMessage(response);
      return {
        valid: false,
        error: errorMessage,
        status: response.status,
      };
    } catch (error) {
      const networkError = handleNetworkError(error);
      return {
        valid: false,
        error: networkError.error,
        networkError: true,
      };
    }
  },
};
