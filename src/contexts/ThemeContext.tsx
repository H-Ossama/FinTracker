import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  success: string;
  warning: string;
  error: string;
  gradientStart: string;
  gradientEnd: string;
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
  // New dark header colors
  headerBackground: string;
  headerText: string;
  headerTextSecondary: string;
  headerSurface: string;
  headerBorder: string;
}

interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

const lightTheme: Theme = {
  isDark: false,
  colors: {
    primary: '#007AFF',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    card: '#FFFFFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    gradientStart: '#F8F9FA',
    gradientEnd: '#FFFFFF',
    tabBarBackground: '#FFFFFF',
    tabBarActive: '#1C1C1E',
    tabBarInactive: '#8E8E93',
    // Dark header for contrast
    headerBackground: '#1C1C1E',
    headerText: '#FFFFFF',
    headerTextSecondary: 'rgba(255, 255, 255, 0.6)',
    headerSurface: '#2C2C2E',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
  },
};

const darkTheme: Theme = {
  isDark: true,
  colors: {
    primary: '#0A84FF',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    card: '#1C1C1E',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    gradientStart: '#000000',
    gradientEnd: '#1C1C1E',
    tabBarBackground: '#1C1C1E',
    tabBarActive: '#FFFFFF',
    tabBarInactive: '#8E8E93',
    // Dark header (same as background in dark mode)
    headerBackground: '#000000',
    headerText: '#FFFFFF',
    headerTextSecondary: 'rgba(255, 255, 255, 0.6)',
    headerSurface: '#1C1C1E',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  themeMode: 'light' | 'dark' | 'auto';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@fintracker_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Load saved theme preference on app start
  useEffect(() => {
    loadThemePreference();
    
    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  const loadThemePreference = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setThemeMode(savedTheme as 'light' | 'dark' | 'auto');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  }, []);

  const saveThemePreference = useCallback(async (theme: 'light' | 'dark' | 'auto') => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }, []);

  // Determine current theme based on mode and system preference
  const getCurrentTheme = useCallback((): Theme => {
    if (themeMode === 'auto') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  }, [themeMode, systemColorScheme]);

  const theme = getCurrentTheme();
  const isDark = theme.isDark;

  const toggleTheme = useCallback(() => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
    saveThemePreference(newMode);
  }, [isDark, saveThemePreference]);

  const setTheme = useCallback((newTheme: 'light' | 'dark' | 'auto') => {
    setThemeMode(newTheme);
    saveThemePreference(newTheme);
  }, [saveThemePreference]);

  const contextValue = useMemo(() => ({
    theme,
    isDark,
    toggleTheme,
    setTheme,
    themeMode,
  }), [theme, isDark, toggleTheme, setTheme, themeMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
});

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper function to create themed styles
export const createThemedStyles = <T extends Record<string, any>>(
  styleFunction: (theme: Theme) => T
) => {
  return (theme: Theme): T => styleFunction(theme);
};