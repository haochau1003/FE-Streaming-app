import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import * as Network from 'expo-network';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/error-boundary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/lib/auth';
import { SocketProvider } from '@/lib/api';
import { ToastProvider } from '@/lib/toast';

export const unstable_settings = {
  anchor: '(tabs)',
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (failureCount >= 2) return false;
          const status = (error as { status?: number } | null)?.status;
          if (status && status >= 400 && status < 500 && status !== 429) return false;
          return true;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

onlineManager.setEventListener((setOnline) => {
  let cancelled = false;
  Network.getNetworkStateAsync()
    .then((s) => {
      if (!cancelled) setOnline(Boolean(s.isConnected && s.isInternetReachable !== false));
    })
    .catch(() => {});

  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return () => {};
  }

  const sub = Network.addNetworkStateListener((s) => {
    setOnline(Boolean(s.isConnected && s.isInternetReachable !== false));
  });

  return () => {
    cancelled = true;
    sub.remove();
  };
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(makeQueryClient);

  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    }
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <ErrorBoundary>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="upload"
                    options={{ presentation: 'modal', title: 'New upload' }}
                  />
                  <Stack.Screen name="library/[id]" options={{ title: '' }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                </Stack>
              </ErrorBoundary>
              <StatusBar style="auto" />
            </ThemeProvider>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
