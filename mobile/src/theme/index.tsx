// src/theme/index.ts
import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ColorTheme } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export interface Theme {
  colors: ColorTheme;
  spacing: typeof spacing;
  typography: typeof typography;
}

const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  typography,
};

const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  typography,
};

const ThemeContext = createContext<Theme>(lightTheme);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme(); // 'light' | 'dark' | null
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): Theme => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
};
