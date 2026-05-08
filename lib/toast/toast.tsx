import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getToken } from '../theme';
import type { ToastLevel, ToastMessage } from '../types';

interface ToastListProps {
  items: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastList({ items, onDismiss }: ToastListProps) {
  if (items.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={styles.container}>
      {items.map((item) => (
        <Toast key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </View>
  );
}

interface ToastProps {
  item: ToastMessage;
  onDismiss: () => void;
}

function Toast({ item, onDismiss }: ToastProps) {
  const scheme = useColorScheme() ?? 'light';
  const card = getToken(scheme, 'bgCard');
  const border = getToken(scheme, 'border');
  const accent = levelAccent(scheme, item.level);

  return (
    <Pressable
      onPress={onDismiss}
      accessibilityRole="alert"
      accessibilityLabel={`${item.title}. ${item.message ?? ''}`}
      style={[styles.toast, { backgroundColor: card, borderColor: border }]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
        {item.message ? (
          <ThemedText style={styles.message}>{item.message}</ThemedText>
        ) : null}
        {item.recoveryHint ? (
          <ThemedText style={styles.hint}>{item.recoveryHint}</ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

function levelAccent(scheme: 'light' | 'dark', level: ToastLevel): string {
  switch (level) {
    case 'success':
      return getToken(scheme, 'chipPublic');
    case 'warning':
      return getToken(scheme, 'chipUnlisted');
    case 'error':
      return getToken(scheme, 'accentDanger');
    case 'info':
    default:
      return getToken(scheme, 'accentUpload');
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.select({ ios: 32, android: 24, default: 16 }),
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minHeight: 56,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  message: {
    opacity: 0.85,
  },
  hint: {
    opacity: 0.65,
    fontSize: 12,
    marginTop: 2,
  },
});
