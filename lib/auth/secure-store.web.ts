import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'content_library_api_key';
const OWNER_ID_KEY = 'content_library_owner_id';

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
