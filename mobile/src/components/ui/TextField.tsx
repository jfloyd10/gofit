// src/components/ui/TextField.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { useTheme, Theme } from '../../theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  ...textInputProps
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const hasError = !!error;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TextInput
        style={[
          styles.input,
          hasError && styles.inputError,
        ]}
        placeholderTextColor={theme.colors.secondaryText}
        {...textInputProps}
      />

      {hasError ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing(3),
    },
    label: {
      marginBottom: theme.spacing(1),
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      paddingHorizontal: theme.spacing(3),
      paddingVertical: theme.spacing(2),
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.primaryText,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      marginTop: theme.spacing(1),
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.error,
    },
  });
