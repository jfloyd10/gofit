// app/(main)/workouts.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/providers/AuthProvider';
import { useTheme, Theme } from '../../src/theme';
import { Screen } from '../../src/components/ui/Screen';

export default function WorkoutsScreen() {
  const { user, isLoading } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  if (isLoading) {
    return <Screen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const handleCreateProgram = () => {
    router.push('/program-builder');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <Text style={styles.subtitle}>
          Create and manage your workout programs
        </Text>
      </View>

      {/* Empty State */}
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="barbell-outline" size={64} color={theme.colors.border} />
        </View>
        <Text style={styles.emptyTitle}>No Programs Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first workout program to get started
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateProgram}>
          <Ionicons name="add-circle" size={20} color={theme.colors.surface} />
          <Text style={styles.createButtonText}>Create Program</Text>
        </TouchableOpacity>
      </View>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateProgram}>
        <Ionicons name="add" size={28} color={theme.colors.surface} />
      </TouchableOpacity>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(4),
    },
    title: {
      fontSize: theme.typography.fontSizeXl,
      fontWeight: '700',
      marginBottom: theme.spacing(1),
      color: theme.colors.primaryText,
    },
    subtitle: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: theme.spacing(20),
    },
    emptyIcon: {
      marginBottom: theme.spacing(4),
    },
    emptyTitle: {
      fontSize: theme.typography.fontSizeLg,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: theme.spacing(2),
    },
    emptySubtitle: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      paddingHorizontal: theme.spacing(8),
      marginBottom: theme.spacing(6),
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing(3),
      paddingHorizontal: theme.spacing(6),
      borderRadius: 12,
      gap: theme.spacing(2),
    },
    createButtonText: {
      fontSize: theme.typography.fontSizeMd,
      fontWeight: '600',
      color: theme.colors.surface,
    },
    fab: {
      position: 'absolute',
      right: theme.spacing(4),
      bottom: theme.spacing(4),
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  });
