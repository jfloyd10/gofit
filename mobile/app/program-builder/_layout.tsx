// app/program-builder/_layout.tsx

import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme';

export default function ProgramBuilderLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: 'slide_from_bottom',
      }}
    />
  );
}
