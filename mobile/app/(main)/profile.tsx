import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';
import { Screen } from '../../src/components/ui/Screen';
import { UserProfileView } from '../../src/components/profile/UserProfileView';
import { useTheme } from '../../src/theme';

export default function ProfileScreen() {
  const { user, isLoading } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    return <Screen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Screen style={{ backgroundColor: theme.colors.background }}>
      {/* We pass showBack={false} because this is a main tab */}
      <UserProfileView username={user.username} showBack={false} />
    </Screen>
  );
}