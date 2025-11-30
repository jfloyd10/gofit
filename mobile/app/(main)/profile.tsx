// app/(main)/profile.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';
import { useTheme, Theme } from '../../src/theme';
import { Screen } from '../../src/components/ui/Screen';

export default function ProfileScreen() {
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
      <View style={styles.section}>
        <Text style={styles.title}>Profile</Text>

        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{user.username}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user.email}</Text>

        {user.profile && (
          <>
            <Text style={styles.label}>Display Name</Text>
            <Text style={styles.value}>{user.profile.display_name || '—'}</Text>

            <Text style={styles.label}>Units</Text>
            <Text style={styles.value}>{user.profile.units}</Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: theme.spacing(3),
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: theme.spacing(2),
    },
    title: {
      fontSize: theme.typography.fontSizeLg,
      fontFamily: theme.typography.fontFamilyBold,
      marginBottom: theme.spacing(2),
      color: theme.colors.primaryText,
    },
    label: {
      fontSize: theme.typography.fontSizeXs,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing(1),
    },
    value: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.primaryText,
    },
  });
