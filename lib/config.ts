import Constants from 'expo-constants';

/**
 * App-wide configuration.
 *
 * The API base URL is read from the EXPO_PUBLIC_API_URL env var.
 * Set it in a .env file at the RN project root, e.g.:
 *   EXPO_PUBLIC_API_URL=http://192.168.1.11:5000
 *
 * EXPO_PUBLIC_ prefix is required — without it, Expo won't expose
 * the var to client-side code at runtime.
 */
const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:5000';

export const config = {
  apiBaseUrl,
};