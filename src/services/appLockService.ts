import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export interface AppLockSettings {
  isEnabled: boolean;
  autoLockTime: string;
  lockOnBackground: boolean;
  requireBiometric: boolean;
  hasPinSet: boolean;
}

class AppLockService {
  private static instance: AppLockService;
  private isLocked: boolean = false;
  private backgroundTime: number | null = null;
  private lastActivity: number = Date.now();
  private lockTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private settings: AppLockSettings | null = null;
  private onLockStateChange: ((isLocked: boolean) => void) | null = null;
  private wasInBackground: boolean = false;

  private constructor() {
    this.setupAppStateListener();
    this.startActivityMonitoring();
  }

  public static getInstance(): AppLockService {
    if (!AppLockService.instance) {
      AppLockService.instance = new AppLockService();
    }
    return AppLockService.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadSettings();
  }

  public setLockStateChangeListener(callback: (isLocked: boolean) => void): void {
    this.onLockStateChange = callback;
  }

  private async loadSettings(): Promise<void> {
    try {
      const savedSettings = await AsyncStorage.getItem('appLockSettings');
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings);
      } else {
        this.settings = {
          isEnabled: false,
          autoLockTime: '5min',
          lockOnBackground: true,
          requireBiometric: false,
          hasPinSet: false,
        };
      }
    } catch (error) {
      console.error('Error loading app lock settings:', error);
      this.settings = {
        isEnabled: false,
        autoLockTime: '5min',
        lockOnBackground: true,
        requireBiometric: false,
        hasPinSet: false,
      };
    }
  }

  public async updateSettings(newSettings: AppLockSettings): Promise<void> {
    try {
      this.settings = newSettings;
      await AsyncStorage.setItem('appLockSettings', JSON.stringify(newSettings));
      
      // Reset lock state if app lock is disabled
      if (!newSettings.isEnabled) {
        this.unlock();
      }
    } catch (error) {
      console.error('Error updating app lock settings:', error);
    }
  }

  public getSettings(): AppLockSettings | null {
    return this.settings;
  }

  public isAppLocked(): boolean {
    return this.isLocked;
  }

  public lock(): void {
    if (!this.settings?.isEnabled) return;
    
    this.isLocked = true;
    this.clearAutoLockTimer();
    this.onLockStateChange?.(true);
  }

  public unlock(): void {
    this.isLocked = false;
    this.backgroundTime = null;
    this.clearAutoLockTimer();
    this.onLockStateChange?.(false);
    this.startAutoLockTimer();
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (!this.settings?.isEnabled) return;

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.handleAppGoingToBackground();
    } else if (nextAppState === 'active') {
      this.handleAppBecomingActive();
    }
  }

  private handleAppGoingToBackground(): void {
    this.backgroundTime = Date.now();
    this.wasInBackground = true;
    this.clearAutoLockTimer();
    
    // Lock immediately if lockOnBackground is enabled
    if (this.settings?.lockOnBackground) {
      this.lock();
    }
  }

  private handleAppBecomingActive(): void {
    // Always lock if app was in background and lock is enabled
    if (this.wasInBackground && this.settings?.isEnabled && 
        (this.settings.hasPinSet || this.settings.requireBiometric)) {
      this.lock();
    }
    
    // Reset activity tracking
    this.lastActivity = Date.now();
    this.wasInBackground = false;
    this.backgroundTime = null;
    
    if (!this.isLocked) {
      this.startAutoLockTimer();
    }
  }

  private startAutoLockTimer(): void {
    if (!this.settings?.isEnabled || this.isLocked) return;
    
    this.clearAutoLockTimer();
    
    const autoLockTimeMs = this.getAutoLockTimeInMs();
    if (autoLockTimeMs > 0) {
      this.lockTimer = setTimeout(() => {
        this.lock();
      }, autoLockTimeMs);
    }
  }

  private clearAutoLockTimer(): void {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }

  private getAutoLockTimeInMs(): number {
    if (!this.settings) return 0;
    
    switch (this.settings.autoLockTime) {
      case 'immediate':
        return 0;
      case '10sec':
        return 10000;
      case '30sec':
        return 30000;
      case '1min':
        return 60000;
      case '2min':
        return 120000;
      case '5min':
        return 300000;
      case '10min':
        return 600000;
      case '15min':
        return 900000;
      case '30min':
        return 1800000;
      case '1hour':
        return 3600000;
      case 'never':
        return Number.MAX_SAFE_INTEGER;
      default:
        return 300000; // 5 minutes default
    }
  }

  public resetAutoLockTimer(): void {
    if (this.settings?.isEnabled && !this.isLocked) {
      this.startAutoLockTimer();
    }
  }

  public shouldShowLockScreen(): boolean {
    if (!this.settings?.isEnabled) return false;
    if (!this.settings.hasPinSet && !this.settings.requireBiometric) return false;
    return this.isLocked;
  }

  public recordActivity(): void {
    this.lastActivity = Date.now();
    this.resetAutoLockTimer();
  }

  private startActivityMonitoring(): void {
    this.activityTimer = setInterval(() => {
      this.checkInactivity();
    }, 1000); // Check every second
  }

  private checkInactivity(): void {
    if (!this.settings?.isEnabled || this.isLocked) return;
    
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    const autoLockTimeMs = this.getAutoLockTimeInMs();
    
    if (autoLockTimeMs > 0 && timeSinceLastActivity >= autoLockTimeMs) {
      this.lock();
    }
  }

  private stopActivityMonitoring(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  public async checkShouldLockOnStart(): Promise<boolean> {
    if (!this.settings?.isEnabled) return false;
    if (!this.settings.hasPinSet && !this.settings.requireBiometric) return false;
    
    // Always lock on app start if app lock is enabled
    return true;
  }

  public cleanup(): void {
    this.clearAutoLockTimer();
    this.stopActivityMonitoring();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

export default AppLockService;