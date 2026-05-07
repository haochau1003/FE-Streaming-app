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

  // #region agent log
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const sendLog = (location: string, message: string, data: Record<string, unknown>) => {
      try {
        fetch('http://127.0.0.1:7674/ingest/795d5b8a-6bc5-49a6-9219-532e850263d6', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f2c4d0' },
          body: JSON.stringify({
            sessionId: 'f2c4d0',
            location,
            message,
            data,
            hypothesisId: 'H1,H2,H3,H4,H5',
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      } catch {}
    };
    const onError = (e: ErrorEvent) => {
      sendLog('window.onerror', 'window error event', {
        message: e?.message,
        filename: e?.filename,
        lineno: e?.lineno,
        colno: e?.colno,
        errorName: (e?.error as Error | undefined)?.name,
        errorMessage: (e?.error as Error | undefined)?.message,
        stack: (e?.error as Error | undefined)?.stack,
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e?.reason as Error | undefined;
      sendLog('window.onunhandledrejection', 'unhandled promise rejection', {
        reasonName: reason?.name,
        reasonMessage: reason?.message,
        stack: reason?.stack,
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    sendLog('app/_layout.tsx:RootLayout', 'global error listeners attached', {
      href: window.location?.href,
      userAgent: window.navigator?.userAgent,
    });
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  // #endregion

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
