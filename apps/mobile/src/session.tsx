import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, ApiError, errorMessage, setSessionExpiredHandler } from './api';
import type { User } from './types';

const key = 'miniledger.session';
async function readToken() {
  return Platform.OS === 'web' ? sessionStorage.getItem(key) : SecureStore.getItemAsync(key);
}
async function writeToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) sessionStorage.setItem(key, token);
    else sessionStorage.removeItem(key);
  } else if (token) await SecureStore.setItemAsync(key, token);
  else await SecureStore.deleteItemAsync(key);
}
interface Session {
  token: string | null;
  user: User | null;
  loading: boolean;
  bootError: string;
  retry: () => void;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: React.PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState('');
  const clear = useCallback(async () => {
    await writeToken(null);
    setToken(null);
    setUser(null);
  }, []);
  const restore = useCallback(() => {
    void readToken()
      .then(async (saved) => {
        if (saved) {
          const result = await api<{ user: User }>('/auth/me', {}, saved);
          setToken(saved);
          setUser(result.user);
        }
      })
      .catch(async (error) => {
        if (error instanceof ApiError && error.status === 401) await clear();
        else setBootError(errorMessage(error));
      })
      .finally(() => setLoading(false));
  }, [clear]);
  useEffect(() => {
    void restore();
  }, [restore]);
  useEffect(() => {
    setSessionExpiredHandler(() => {
      void clear();
    });
    return () => setSessionExpiredHandler();
  }, [clear]);
  async function signIn(value: string, person: User) {
    await writeToken(value);
    setToken(value);
    setUser(person);
  }
  async function signOut() {
    if (token) await api('/auth/logout', { method: 'POST' }, token);
    await clear();
  }
  function retry() {
    setLoading(true);
    setBootError('');
    void restore();
  }
  return (
    <Context.Provider value={{ token, user, loading, bootError, retry, signIn, signOut }}>
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const session = useContext(Context);
  if (!session) throw new Error('SessionProvider is missing');
  return session;
}
