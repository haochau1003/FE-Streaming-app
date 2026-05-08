import * as SecureStore from 'expo-secure-store';

const KEY = 'content_library_api_key';
const OWNER_ID_KEY = 'content_library_owner_id';

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, value);
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export async function getOwnerId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(OWNER_ID_KEY);
  } catch {
    return null;
  }
}

export async function setOwnerId(value: string): Promise<void> {
  await SecureStore.setItemAsync(OWNER_ID_KEY, value);
}

export async function clearOwnerId(): Promise<void> {
  await SecureStore.deleteItemAsync(OWNER_ID_KEY);
}
