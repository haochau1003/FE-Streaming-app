import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import * as SecureStore from './secure-store';

interface AuthContextValue {
  apiKey: string | null;
  currentUserId: string | null;
  isReady: boolean;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  setCurrentUserId: (id: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let apiKeyRef: string | null = null;
export function readApiKeyFromMemory(): string | null {
  return apiKeyRef;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([SecureStore.getApiKey(), SecureStore.getOwnerId()]).then(([key, ownerId]) => {
      if (cancelled) return;
      apiKeyRef = key;
      setApiKeyState(key);
      setCurrentUserId(ownerId);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setApiKey = useCallback(async (key: string) => {
    await SecureStore.setApiKey(key);
    apiKeyRef = key;
    setApiKeyState(key);
  }, []);

  const clearApiKey = useCallback(async () => {
    await SecureStore.clearApiKey();
    await SecureStore.clearOwnerId();
    apiKeyRef = null;
    setApiKeyState(null);
    setCurrentUserId(null);
  }, []);

  const updateCurrentUserId = useCallback(async (id: string | null) => {
    if (id) await SecureStore.setOwnerId(id);
    else await SecureStore.clearOwnerId();
    setCurrentUserId(id);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        apiKey,
        currentUserId,
        isReady,
        setApiKey,
        clearApiKey,
        setCurrentUserId: updateCurrentUserId,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider />');
  return ctx;
}
