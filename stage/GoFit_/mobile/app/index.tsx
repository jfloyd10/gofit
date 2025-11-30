import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/providers/AuthProvider';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // You can put a loading spinner here if you want
    return null;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(main)/home" />;
}
