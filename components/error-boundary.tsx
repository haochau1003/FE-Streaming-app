import React, { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { log } from '@/lib/log';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    log.error('ErrorBoundary caught', error, info.componentStack);
    // #region agent log
    try {
      fetch('http://127.0.0.1:7674/ingest/795d5b8a-6bc5-49a6-9219-532e850263d6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f2c4d0' },
        body: JSON.stringify({
          sessionId: 'f2c4d0',
          location: 'components/error-boundary.tsx:25',
          message: 'ErrorBoundary caught error',
          data: {
            name: error?.name,
            errorMessage: error?.message,
            stack: error?.stack?.slice(0, 1500),
            componentStack: info?.componentStack?.slice(0, 1500),
          },
          hypothesisId: 'H4',
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
    // #endregion
    // #region agent log 408fbe
    try {
      fetch('http://127.0.0.1:7668/ingest/9f6f7fd6-c60b-4cba-93ac-703e2e5b4d17', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '408fbe' },
        body: JSON.stringify({
          sessionId: '408fbe',
          runId: 'post-fix',
          location: 'components/error-boundary.tsx:25',
          message: 'ErrorBoundary caught error (post-fix verification)',
          data: {
            name: error?.name,
            errorMessage: error?.message,
            stack: error?.stack,
            componentStack: info?.componentStack,
          },
          hypothesisId: 'H6',
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
    // #endregion
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Something went wrong
        </ThemedText>
        <ThemedText style={styles.message}>
          {this.state.error.message || 'Unexpected render error.'}
        </ThemedText>
        <Pressable onPress={this.reset} style={styles.button} accessibilityRole="button">
          <View>
            <ThemedText type="defaultSemiBold" style={styles.buttonLabel}>
              Try again
            </ThemedText>
          </View>
        </Pressable>
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    opacity: 0.8,
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#f54040',
  },
  buttonLabel: {
    color: '#ffffff',
  },
});
