// app/session/[id].tsx
import React from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../src/theme';
import { SessionDetailScreen } from '../../src/screens/SessionDetailScreen';

export default function SessionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const sessionId = parseInt(id || '0', 10);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/workouts');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SessionDetailScreen sessionId={sessionId} onBack={handleBack} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
