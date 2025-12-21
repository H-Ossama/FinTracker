import { signInWithCredential, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { firebaseAuth } from '../config/firebase';
import { firebaseDataService } from './firebaseDataService';

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface AuthResult {
  success: boolean;
  user?: FirebaseUser;
  message: string;
}

class FirebaseAuthService {
  private currentUser: User | null = null;
  private authListeners: ((user: FirebaseUser | null) => void)[] = [];

  constructor() {
    // Listen to auth state changes
    onAuthStateChanged(firebaseAuth, (user) => {
      this.currentUser = user;
      const firebaseUser = user ? this.formatUser(user) : null;
      
      // Set user ID in data service
      if (user) {
        firebaseDataService.setUserId(user.uid);
      }
      
      // Notify listeners
      this.authListeners.forEach(listener => listener(firebaseUser));
    });
  }

  private formatUser(user: User): FirebaseUser {
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || undefined,
    };
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<AuthResult> {
    try {
      console.log('🔑 Starting Google Sign-In with React Native Firebase...');

      // Check if device supports Google Play services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get Google sign-in result
      const result = await GoogleSignin.signIn();
      console.log('✅ Got Google sign-in result');

      // Extract ID token from the result
      let idToken = null;
      if (result.data?.idToken) {
        idToken = result.data.idToken;
      } else if (result.idToken) {
        idToken = result.idToken;
      } else {
        // Try to get tokens separately
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }

      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }

      return await this.signInWithGoogleIdToken(idToken);
    } catch (error) {
      console.error('❌ Firebase Google Sign-In error:', error);
      return {
        success: false,
        message: `Firebase sign-in failed: ${error}`,
      };
    }
  }

  /**
   * Sign in to Firebase using an already-obtained Google ID token.
   * This avoids triggering a second interactive Google sign-in flow.
   */
  async signInWithGoogleIdToken(idToken: string): Promise<AuthResult> {
    try {
      if (!idToken) {
        return { success: false, message: 'Missing Google ID token' };
      }

      console.log('✅ Got Google ID token (external)');

      // Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(idToken);
      console.log('✅ Created Firebase credential');

      // Sign in to Firebase
      const userCredential = await signInWithCredential(firebaseAuth, googleCredential);
      const user = userCredential.user;
      console.log('✅ Signed in to Firebase:', user.email);

      // Create user profile in Firestore if it's a new user
      if (userCredential.additionalUserInfo?.isNewUser) {
        console.log('👤 New user detected, creating profile...');
        await firebaseDataService.createUserProfile(
          user.uid,
          user.email || '',
          user.displayName || ''
        );
      }

      return {
        success: true,
        user: this.formatUser(user),
        message: 'Successfully signed in with Google and Firebase',
      };
    } catch (error) {
      console.error('❌ Firebase sign-in (idToken) error:', error);
      return {
        success: false,
        message: `Firebase sign-in failed: ${error}`,
      };
    }
  }

  // Sign out
  async signOut(): Promise<AuthResult> {
    try {
      // Sign out from Firebase
      await signOut(firebaseAuth);
      
      // Sign out from Google
      await GoogleSignin.signOut();

      console.log('✅ Signed out from Firebase and Google');

      return {
        success: true,
        message: 'Successfully signed out',
      };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return {
        success: false,
        message: `Sign out failed: ${error}`,
      };
    }
  }

  // Get current user
  getCurrentUser(): FirebaseUser | null {
    return this.currentUser ? this.formatUser(this.currentUser) : null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  // Add auth state listener
  addAuthListener(callback: (user: FirebaseUser | null) => void): () => void {
    this.authListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(callback);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  // Get current user ID for database operations
  getUserId(): string | null {
    return this.currentUser?.uid || null;
  }

  // Get user email
  getUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  // Get user display name
  getUserDisplayName(): string | null {
    return this.currentUser?.displayName || null;
  }

  // Get Firebase ID token for current user
  async getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    try {
      if (!this.currentUser) return null;
      const token = await this.currentUser.getIdToken(forceRefresh);
      return token || null;
    } catch (error) {
      console.error('❌ Error getting Firebase ID token:', error);
      return null;
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;