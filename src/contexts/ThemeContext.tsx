import React, { createContext, useContext, useState, useEffect } from 'react';
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
}

interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

const lightTheme: Theme = {
  isDark: false,
  colors: {
    primary: '#4A90E2',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    text: '#333333',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    card: '#FFFFFF',
    success: '#7ED321',
    warning: '#FF9500',
    error: '#FF3B30',
    gradientStart: '#F8F9FA',
    gradientEnd: '#FFFFFF',
    tabBarBackground: '#FFFFFF',
    tabBarActive: '#4A90E2',
    tabBarInactive: '#8E8E93',
  },
};

const darkTheme: Theme = {
  isDark: true,
  colors: {
    primary: '#5BA0F2',
    background: '#0D1117',
    surface: '#161B22',
    text: '#F0F6FC',
    textSecondary: '#7D8590',
    border: '#30363D',
    card: '#21262D',
    success: '#238636',
    warning: '#F85149',
    error: '#F85149',
    gradientStart: '#0D1117',
    gradientEnd: '#161B22',
    tabBarBackground: '#161B22',
    tabBarActive: '#58A6FF',
    tabBarInactive: '#7D8590',
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setThemeMode(savedTheme as 'light' | 'dark' | 'auto');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (theme: 'light' | 'dark' | 'auto') => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Determine current theme based on mode and system preference
  const getCurrentTheme = (): Theme => {
    if (themeMode === 'auto') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const theme = getCurrentTheme();
  const isDark = theme.isDark;

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
    saveThemePreference(newMode);
  };

  const setTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    setThemeMode(newTheme);
    saveThemePreference(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        setTheme,
        themeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

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