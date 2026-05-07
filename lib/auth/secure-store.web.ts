import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'content_library_api_key';
const OWNER_ID_KEY = 'content_library_owner_id';

// #region agent log
try {
  fetch('http://127.0.0.1:7674/ingest/795d5b8a-6bc5-49a6-9219-532e850263d6', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f2c4d0' },
    body: JSON.stringify({
      sessionId: 'f2c4d0',
      location: 'lib/auth/secure-store.web.ts:moduleLoad',
      message: 'web secure-store loaded',
      data: {
        hasLocalStorage:
          typeof globalThis !== 'undefined' &&
          typeof (globalThis as { localStorage?: unknown }).localStorage !== 'undefined',
        hasAsyncStorage: typeof AsyncStorage !== 'undefined',
      },
      hypothesisId: 'H3,H5',
      timestamp: Date.now(),
    }),
  }).catch(() => {});
} catch {}
// #endregion

export async function getApiKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(value: string): Promise<void> {
  await AsyncStorage.setItem(KEY, value);
}

export async function clearApiKey(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function getOwnerId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(OWNER_ID_KEY);
  } catch {
    return null;
  }
}

export async function setOwnerId(value: string): Promise<void> {
  await AsyncStorage.setItem(OWNER_ID_KEY, value);
}

export async function clearOwnerId(): Promise<void> {
  await AsyncStorage.removeItem(OWNER_ID_KEY);
}
