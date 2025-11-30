// app/(main)/workouts.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';
import { useTheme, Theme } from '../../src/theme';
import { Screen } from '../../src/components/ui/Screen';




export default function WorkoutsScreen() {
  const { user, isLoading } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (isLoading) {
    return <Screen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <Text style={styles.subtitle}>
          This is where your workout history, plans, and logging UI will live.
        </Text>
      </View>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      marginTop: theme.spacing(2),
    },
    title: {
      fontSize: theme.typography.fontSizeLg,
      fontFamily: theme.typography.fontFamilyBold,
      marginBottom: theme.spacing(1),
      color: theme.colors.primaryText,
    },
    subtitle: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
    },
  });
