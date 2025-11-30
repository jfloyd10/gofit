// app/program-builder/[id].tsx

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '../../src/theme';
import { useAuth } from '../../src/providers/AuthProvider';
import { ProgramBuilderScreen } from '../../src/screens/ProgramBuilderScreen';

export default function EditProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { accessToken } = useAuth();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const programId = id ? parseInt(id, 10) : undefined;

  const handleBack = () => {
    router.back();
  };

  const handleSaveSuccess = (savedProgramId: number) => {
    // Navigate back to workouts or program detail
    router.replace('/(main)/workouts');
  };

  if (!programId) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Invalid program ID</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={['top']}
    >
      <ProgramBuilderScreen
        programId={programId}
        onBack={handleBack}
        onSaveSuccess={handleSaveSuccess}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: theme.typography.fontSizeMd,
      color: theme.colors.error,
    },
  });
