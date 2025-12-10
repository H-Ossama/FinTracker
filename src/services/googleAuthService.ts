import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseAuthService } from './firebaseAuthService';

// Conditionally import Google Sign-In to prevent bundling issues
let GoogleSignin: any = null;
let GoogleSigninButton: any = null;
let statusCodes: any = null;

try {
  const googleSignInModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignInModule.GoogleSignin;
  GoogleSigninButton = googleSignInModule.GoogleSigninButton;
  statusCodes = googleSignInModule.statusCodes;
} catch (error) {
  console.warn('Google Sign-In module not available:', error.message);
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  photo?: string;
  idToken: string;
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    photo?: string;
  };
}

export interface GoogleAuthResult {
  success: boolean;
  user?: GoogleUser;
  error?: string;
}

class GoogleAuthService {
  private isConfigured = false;

  async configure() {
    if (this.isConfigured) return;

    try {
      // Check if Google Sign-In is available
      if (!GoogleSignin) {
        console.warn('⚠️ Google Sign-In module not available - running without Google authentication');
        this.isConfigured = false;
        return;
      }

      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '123456789-abcdefg.apps.googleusercontent.com';
      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      
      console.log('🔧 Configuring Google Sign-In...');
      console.log('📱 Web Client ID:', webClientId.substring(0, 20) + '...');
      console.log('📦 Expected package: com.oussamaaaaa.finex');
      console.log('🔑 Expected SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25');
      
      // Validate configuration before proceeding
      if (!webClientId || webClientId.includes('abcdefg')) {
        throw new Error('Invalid or missing Web Client ID in environment variables');
      }
      
      if (iosClientId) {
        console.log('🍎 iOS Client ID:', iosClientId.substring(0, 20) + '...');
      } else {
        console.log('🍎 iOS Client ID: Not configured (Android only)');
      }

      await GoogleSignin.configure({
        // This will be populated from your Firebase project settings
        webClientId: webClientId,
        offlineAccess: true,
        hostedDomain: '', // specify a domain if you want to restrict access
        forceCodeForRefreshToken: true,
        accountName: '',
        iosClientId: iosClientId, // only for iOS
        googleServicePlistPath: '', // only for iOS
      });

      this.isConfigured = true;
      console.log('✅ Google Sign-In configured successfully');
      console.log('📋 Configuration validated for package: com.oussamaaaaa.finex');
    } catch (error) {
      console.error('❌ Error configuring Google Sign-In:', error);
      
      // Make Google Sign-In optional - don't throw error
      console.log('⚠️ Google Sign-In configuration failed, but app will continue without it');
      console.log('🔍 Troubleshooting tips:');
      console.log('   1. Verify package name: com.oussamaaaaa.finex');
      console.log('   2. Verify SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25');
      console.log('   3. Check google-services.json in android/app/');
      console.log('   4. Verify Web Client ID in .env file');
      this.isConfigured = false;
    }
  }

  async signIn(): Promise<GoogleAuthResult> {
    try {
      await this.configure();

      // Check if Google Sign-In is available
      if (!GoogleSignin) {
        return { 
          success: false, 
          error: 'Google Sign-In is not available in this build. Please use email/password authentication.' 
        };
      }

      // Check if configuration was successful
      if (!this.isConfigured) {
        return { 
          success: false, 
          error: 'Google Sign-In is not properly configured. Please check your Firebase settings.' 
        };
      }

      // Check if device has Google Play Services
      await GoogleSignin.hasPlayServices();

      // Perform sign-in
      const result = await GoogleSignin.signIn();
      
      if (!result || !result.data) {
        return { success: false, error: 'Sign-in was cancelled or failed' };
      }

      const tokens = await GoogleSignin.getTokens();
      
      const googleUser: GoogleUser = {
        id: result.data.user.id,
        email: result.data.user.email,
        name: result.data.user.name || result.data.user.email,
        photo: result.data.user.photo || undefined,
        idToken: result.data.idToken || tokens.idToken,
        accessToken: tokens.accessToken,
        user: {
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.name || result.data.user.email,
          photo: result.data.user.photo || undefined,
        },
      };

      // Store Google tokens securely
      await this.storeTokens(googleUser);

      console.log('✅ Google Sign-In successful:', googleUser.email);

      // Also sign in to Firebase
      console.log('🔥 Signing in to Firebase...');
      const firebaseResult = await firebaseAuthService.signInWithGoogle();
      
      if (!firebaseResult.success) {
        console.error('❌ Firebase sign-in failed:', firebaseResult.message);
        // Continue with Google-only auth for now, Firebase can be optional
      } else {
        console.log('✅ Firebase sign-in successful:', firebaseResult.user?.email);
      }

      return { success: true, user: googleUser };

    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      
      let errorMessage = 'An unexpected error occurred during Google Sign-In';
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign-in is already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available';
      } else if (error.message?.includes('DEVELOPER_ERROR')) {
        errorMessage = 'Google Sign-In configuration error. Configuration mismatch detected.';
        console.log('🚨 DEVELOPER_ERROR Details:');
        console.log('🔍 Debug info: Expected package: com.oussamaaaaa.finex');
        console.log('🔍 Debug info: Expected SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25');
        console.log('🔍 Debug info: Web Client ID should be: 1034435232632-cfdpko...');
        console.log('📝 Troubleshooting steps:');
        console.log('   1. Rebuild the app with: npx expo run:android');
        console.log('   2. Verify google-services.json is in android/app/');
        console.log('   3. Check Firebase Console for package name and SHA-1');
        console.log('   4. Ensure debug keystore matches SHA-1 fingerprint');
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    }
  }

  async signOut(): Promise<boolean> {
    try {
      if (!GoogleSignin) {
        console.warn('Google Sign-In not available for sign out');
        return true;
      }

      await this.configure();
      await GoogleSignin.signOut();
      await this.clearStoredTokens();
      console.log('✅ Google Sign-Out successful');
      return true;
    } catch (error) {
      console.error('❌ Google Sign-Out error:', error);
      return false;
    }
  }

  async revokeAccess(): Promise<boolean> {
    try {
      if (!GoogleSignin) {
        console.warn('Google Sign-In not available for revoke access');
        return true;
      }

      await this.configure();
      await GoogleSignin.revokeAccess();
      await this.clearStoredTokens();
      console.log('✅ Google access revoked successfully');
      return true;
    } catch (error) {
      console.error('❌ Google revoke access error:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<GoogleUser | null> {
    try {
      if (!GoogleSignin) {
        console.warn('Google Sign-In not available for getCurrentUser');
        return null;
      }

      await this.configure();
      const user = await GoogleSignin.getCurrentUser();
      
      if (!user) {
        return null;
      }

      const tokens = await GoogleSignin.getTokens();
      
      return {
        id: user.user.id,
        email: user.user.email,
        name: user.user.name || user.user.email,
        photo: user.user.photo || undefined,
        idToken: user.idToken || tokens.idToken,
        accessToken: tokens.accessToken,
      };
    } catch (error) {
      console.error('❌ Error getting current Google user:', error);
      return null;
    }
  }

  async isSignedIn(): Promise<boolean> {
    try {
      if (!GoogleSignin) {
        return false;
      }

      await this.configure();
      const currentUser = await GoogleSignin.getCurrentUser();
      return currentUser !== null;
    } catch (error) {
      console.error('❌ Error checking Google Sign-In status:', error);
      return false;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      if (!GoogleSignin) {
        return null;
      }

      await this.configure();
      const tokens = await GoogleSignin.getTokens();
      return tokens.accessToken;
    } catch (error) {
      console.error('❌ Error refreshing Google token:', error);
      return null;
    }
  }

  private async storeTokens(user: GoogleUser): Promise<void> {
    try {
      // Store tokens securely
      await SecureStore.setItemAsync('google_id_token', user.idToken);
      await SecureStore.setItemAsync('google_access_token', user.accessToken);
      
      // Store user info
      await AsyncStorage.setItem('google_user_info', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        photo: user.photo,
      }));

      console.log('✅ Google tokens stored securely');
    } catch (error) {
      console.error('❌ Error storing Google tokens:', error);
      throw error;
    }
  }

  private async clearStoredTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('google_id_token');
      await SecureStore.deleteItemAsync('google_access_token');
      await AsyncStorage.removeItem('google_user_info');
      console.log('✅ Google tokens cleared');
    } catch (error) {
      console.error('❌ Error clearing Google tokens:', error);
    }
  }

  async getStoredTokens(): Promise<{ idToken: string; accessToken: string } | null> {
    try {
      const idToken = await SecureStore.getItemAsync('google_id_token');
      const accessToken = await SecureStore.getItemAsync('google_access_token');
      
      if (idToken && accessToken) {
        return { idToken, accessToken };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting stored Google tokens:', error);
      return null;
    }
  }

  async getStoredUserInfo(): Promise<Partial<GoogleUser> | null> {
    try {
      const userInfo = await AsyncStorage.getItem('google_user_info');
      if (userInfo) {
        return JSON.parse(userInfo);
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting stored Google user info:', error);
      return null;
    }
  }
}

export const googleAuthService = new GoogleAuthService();
export { GoogleSigninButton };
export default googleAuthService;