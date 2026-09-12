import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from '../services/auth';

import {
  getAccessToken,
  getRefreshToken,
} from '../services/authStorage';

import type { AuthUser } from '../types/auth';

interface AuthContextData {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;

  signIn: (
    username: string,
    password: string,
  ) => Promise<void>;

  signOut: () => Promise<void>;

  reloadUser: () => Promise<void>;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<
  AuthContextData | undefined
>(undefined);

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const reloadUser = useCallback(async () => {
    const currentUser = await getCurrentUser();

    setUser(currentUser);
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      setLoading(true);

      const accessToken = await getAccessToken();
      const refreshToken = await getRefreshToken();

      if (!accessToken && !refreshToken) {
        setUser(null);
        return;
      }

      await reloadUser();
    } catch (error) {
      console.log(
        'Não foi possível restaurar a sessão:',
        error,
      );

      await logoutRequest();

      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [reloadUser]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const signIn = useCallback(
    async (
      username: string,
      password: string,
    ) => {
      await loginRequest(username, password);

      await reloadUser();
    },
    [reloadUser],
  );

  const signOut = useCallback(async () => {
    await logoutRequest();

    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      signIn,
      signOut,
      reloadUser,
    }),
    [
      user,
      loading,
      signIn,
      signOut,
      reloadUser,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth deve ser utilizado dentro de AuthProvider.',
    );
  }

  return context;
}
