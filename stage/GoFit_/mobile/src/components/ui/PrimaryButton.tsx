// src/components/ui/PrimaryButton.tsx
import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme, Theme } from '../../theme';

type ButtonVariant = 'primary' | 'outline';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle | ViewStyle[];
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isDisabled = disabled || loading;

  const containerStyles = [
    styles.base,
    variant === 'primary' ? styles.primary : styles.outline,
    isDisabled && (variant === 'primary' ? styles.primaryDisabled : styles.outlineDisabled),
    style,
  ];

  const textStyles = [
    styles.textBase,
    variant === 'primary' ? styles.textPrimary : styles.textOutline,
    isDisabled && (variant === 'primary' ? styles.textPrimaryDisabled : styles.textOutlineDisabled),
  ];

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? theme.colors.surface : theme.colors.primary}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      borderRadius: 999,
      paddingVertical: theme.spacing(3),
      paddingHorizontal: theme.spacing(4),
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: theme.colors.primary,
    },
    primaryDisabled: {
      backgroundColor: theme.colors.primarySoft,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    outlineDisabled: {
      borderColor: theme.colors.border,
    },
    textBase: {
      fontSize: theme.typography.fontSizeMd,
      fontFamily: theme.typography.fontFamilyBold,
    },
    textPrimary: {
      color: theme.colors.surface,
    },
    textPrimaryDisabled: {
      color: theme.colors.surface,
      opacity: 0.7,
    },
    textOutline: {
      color: theme.colors.primary,
    },
    textOutlineDisabled: {
      color: theme.colors.secondaryText,
    },
  });
