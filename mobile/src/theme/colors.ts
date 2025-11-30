// src/theme/colors.ts

// Raw palette
export const palette = {
  blue: '#0A84FF',
  blueDark: '#0060DF',
  blueSoft: '#E5F0FF',
  red: '#FF3B30',
  redSoft: '#FFE5E2',
  gray0: '#FFFFFF',
  gray50: '#F5F5F7',
  gray100: '#E5E5EA',
  gray300: '#C7C7CC',
  gray500: '#8E8E93',
  gray700: '#3A3A3C',
  gray900: '#1C1C1E',
  black: '#000000',
};

export const lightColors = {
  background: palette.gray50,
  surface: palette.gray0,
  primary: palette.blue,
  primarySoft: palette.blueSoft,
  primaryText: palette.gray900,
  secondaryText: palette.gray500,
  border: palette.gray100,
  error: palette.red,
  errorSoft: palette.redSoft,
  success: '#34C759',
};

export const darkColors = {
  background: palette.black,
  surface: palette.gray900,
  primary: palette.blue,
  primarySoft: '#102542',
  primaryText: palette.gray0,
  secondaryText: palette.gray300,
  border: palette.gray700,
  error: palette.red,
  errorSoft: '#4A1C18',
  success: '#32D74B',
};

export type ColorTheme = typeof lightColors;
