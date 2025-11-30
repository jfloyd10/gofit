// app/program-builder/index.tsx

import React from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { ProgramBuilderScreen } from '../../src/screens/ProgramBuilderScreen';

export default function NewProgramScreen() {
  const router = useRouter();
  const theme = useTheme();

  const handleBack = () => {
    router.back();
  };

  const handleSaveSuccess = (programId: number) => {
    // Navigate back to workouts or program detail
    router.replace('/(main)/workouts');
  };

  return (
    <SafeAreaView 
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={['top']}
    >
      <ProgramBuilderScreen
        onBack={handleBack}
        onSaveSuccess={handleSaveSuccess}
      />
    </SafeAreaView>
  );
}
