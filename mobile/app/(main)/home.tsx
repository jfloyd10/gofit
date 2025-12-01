// app/(main)/home.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect, useRouter  } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';
import { useTheme, Theme } from '../../src/theme';
import { Screen } from '../../src/components/ui/Screen';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';

export default function HomeScreen() {
  const { user, signOut, isLoading } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  if (isLoading) {
    return <Screen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Screen center>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to GoFit</Text>

        <Text style={styles.subtitle}>Logged in as: {user.username}</Text>
        {user.profile?.display_name ? (
          <Text style={styles.subtitle}>Display Name: {user.profile.display_name}</Text>
        ) : null}

        {/* 🔹 Temporary debug button to open a specific session */}
        <PrimaryButton
          title="Debug: Open Session #1"
          onPress={() => router.push('/session/1')}
          style={styles.button}
        />


        <PrimaryButton
          title="Sign Out"
          onPress={signOut}
          variant="outline"
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: theme.spacing(4),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    title: {
      fontSize: theme.typography.fontSizeLg,
      fontFamily: theme.typography.fontFamilyBold,
      marginBottom: theme.spacing(2),
      textAlign: 'center',
      color: theme.colors.primaryText,
    },
    subtitle: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      marginBottom: theme.spacing(1),
    },
    button: {
      marginTop: theme.spacing(4),
    },
  });
