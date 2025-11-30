import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi, AuthUser } from '../lib/api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_KEY = 'gofit_access_token';
const REFRESH_KEY = 'gofit_refresh_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load tokens + user on app start
  useEffect(() => {
    (async () => {
      try {
        const storedAccess = await SecureStore.getItemAsync(ACCESS_KEY);
        const storedRefresh = await SecureStore.getItemAsync(REFRESH_KEY);

        if (storedAccess) {
          setAccessToken(storedAccess);
          // we don't yet use storedRefresh, but we save it for later
          try {
            const me = await authApi.getCurrentUser(storedAccess);
            setUser(me);
          } catch {
            // token invalid/expired → silently ignore, user stays logged out
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = async (username: string, password: string) => {
    // Let errors bubble to caller (login screen) to show proper messages.
    const tokens = await authApi.login(username, password);
    setAccessToken(tokens.access);
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.access);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh);

    const me = await authApi.getCurrentUser(tokens.access);
    setUser(me);
  };

  const signOut = async () => {
    setUser(null);
    setAccessToken(null);
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  };

  const value: AuthContextValue = {
    user,
    accessToken,
    isLoading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
