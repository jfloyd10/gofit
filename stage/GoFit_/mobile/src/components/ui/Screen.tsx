// src/components/ui/Screen.tsx
import React, { ReactNode, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '../../theme';

interface ScreenProps {
  children: ReactNode;
  center?: boolean;
  withKeyboardAvoiding?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  center = false,
  withKeyboardAvoiding = false,
  style,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, center), [theme, center]);

  const content = (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );

  if (withKeyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
};

const createStyles = (theme: Theme, center: boolean) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing(4),
      paddingVertical: theme.spacing(4),
      justifyContent: center ? 'center' : 'flex-start',
    },
  });
