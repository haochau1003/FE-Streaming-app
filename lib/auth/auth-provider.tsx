import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import * as SecureStore from './secure-store';

// #region agent log
const dbgAuth = (location: string, message: string, data: Record<string, unknown>) => {
  try {
    fetch('http://127.0.0.1:7674/ingest/795d5b8a-6bc5-49a6-9219-532e850263d6', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f2c4d0' },
      body: JSON.stringify({
        sessionId: 'f2c4d0',
        location,
        message,
        data,
        hypothesisId: 'H2,H3,H5',
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
};
let mountCounter = 0;
// #endregion

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
    // #region agent log
    mountCounter += 1;
    const myMount = mountCounter;
    dbgAuth('lib/auth/auth-provider.tsx:mount', 'AuthProvider mounted', {
      mountCount: myMount,
    });
    // #endregion
    Promise.all([SecureStore.getApiKey(), SecureStore.getOwnerId()])
      .then(([key, ownerId]) => {
        // #region agent log
        dbgAuth('lib/auth/auth-provider.tsx:mount:loaded', 'SecureStore initial read', {
          mountCount: myMount,
          cancelled,
          keyPresent: Boolean(key),
          keyLen: key ? key.length : 0,
          ownerIdPresent: Boolean(ownerId),
          ownerIdLen: ownerId ? ownerId.length : 0,
        });
        // #endregion
        if (cancelled) return;
        apiKeyRef = key;
        setApiKeyState(key);
        setCurrentUserId(ownerId);
        setReady(true);
      })
      .catch((err) => {
        // #region agent log
        dbgAuth('lib/auth/auth-provider.tsx:mount:loadError', 'SecureStore initial read threw', {
          mountCount: myMount,
          name: (err as Error)?.name,
          errorMessage: (err as Error)?.message,
        });
        // #endregion
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setApiKey = useCallback(async (key: string) => {
    // #region agent log
    dbgAuth('lib/auth/auth-provider.tsx:setApiKey:before', 'about to write key', {
      keyLen: key?.length ?? 0,
    });
    // #endregion
    try {
      await SecureStore.setApiKey(key);
      // #region agent log
      const readBack = await SecureStore.getApiKey();
      dbgAuth('lib/auth/auth-provider.tsx:setApiKey:roundtrip', 'wrote then read back', {
        wroteLen: key?.length ?? 0,
        readBackPresent: Boolean(readBack),
        readBackLen: readBack ? readBack.length : 0,
        match: readBack === key,
      });
      // #endregion
      apiKeyRef = key;
      setApiKeyState(key);
    } catch (err) {
      // #region agent log
      dbgAuth('lib/auth/auth-provider.tsx:setApiKey:throw', 'SecureStore.setApiKey threw', {
        name: (err as Error)?.name,
        errorMessage: (err as Error)?.message,
        stack: (err as Error)?.stack?.slice(0, 800),
      });
      // #endregion
      throw err;
    }
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
