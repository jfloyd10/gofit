import React from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { UserProfileView } from '../../src/components/profile/UserProfileView';
import { useTheme } from '../../src/theme';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const theme = useTheme();

  return (
    <Screen style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      {username && <UserProfileView username={username} showBack={true} />}
    </Screen>
  );
}