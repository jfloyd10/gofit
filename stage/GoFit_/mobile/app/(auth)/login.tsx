// app/(auth)/login.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';
import { ApiError } from '../../src/lib/api/auth';
import { useTheme, Theme } from '../../src/theme';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';

export default function LoginScreen() {
  const { signIn, user, isLoading } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </Screen>
    );
  }

  if (user) {
    return <Redirect href="/(main)/home" />;
  }

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!username || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(username, password);
      // On success, user is set, Redirect kicks in
    } catch (err: any) {
      console.log('Login error:', err);

      if (err instanceof ApiError) {
        if (err.status === 0) {
          setErrorMessage('Unable to reach the server. Check your internet connection and try again.');
        } else if (err.status === 400 || err.status === 401) {
          setErrorMessage('Invalid username or password. Please try again.');
        } else if (err.status >= 500) {
          setErrorMessage('We are having trouble on our end. Please try again in a few minutes.');
        } else {
          setErrorMessage(err.message || 'Something went wrong. Please try again.');
        }
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoginDisabled = !username || !password || isSubmitting;

  return (
    <Screen withKeyboardAvoiding center>
      <View style={styles.header}>
        <Text style={styles.appName}>GoFit</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
      </View>

      <View>
        <TextField
          label="Username"
          placeholder="Enter your username"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          returnKeyType="next"
        />

        <TextField
          label="Password"
          placeholder="Enter your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          error={null}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <PrimaryButton
          title="Log In"
          onPress={handleLogin}
          loading={isSubmitting}
          disabled={isLoginDisabled}
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Forgot your password?</Text>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      marginBottom: theme.spacing(6),
      alignItems: 'center',
    },
    appName: {
      fontSize: theme.typography.fontSizeDisplay,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
      marginBottom: theme.spacing(1),
    },
    title: {
      fontSize: theme.typography.fontSizeLg,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.primaryText,
    },
    subtitle: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing(1),
    },
    errorText: {
      color: theme.colors.error,
      marginBottom: theme.spacing(2),
      textAlign: 'center',
      fontSize: theme.typography.fontSizeSm,
    },
    button: {
      marginTop: theme.spacing(2),
    },
    footer: {
      marginTop: theme.spacing(3),
      alignItems: 'center',
    },
    footerText: {
      fontSize: theme.typography.fontSizeSm,
      color: theme.colors.secondaryText,
    },
  });
