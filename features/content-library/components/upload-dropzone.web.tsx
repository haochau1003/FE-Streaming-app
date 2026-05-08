import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getToken } from '@/lib/theme';

import type { UploadFile } from '@/lib/api';

interface UploadDropzoneProps {
  onSelected: (files: UploadFile[]) => void;
}

interface DragLikeEvent {
  preventDefault: () => void;
  dataTransfer?: { files?: FileList | null } | null;
}

export function UploadDropzone({ onSelected }: UploadDropzoneProps) {
  const scheme = useColorScheme() ?? 'light';
  const dashed = getToken(scheme, 'border');
  const cardBg = getToken(scheme, 'bgCard');
  const accent = getToken(scheme, 'accentUpload');
  const tertiary = getToken(scheme, 'textTertiary');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hover, setHover] = useState(false);

  const onPickClick = () => inputRef.current?.click();

  const onChange = useCallback(
    (e: { target: { files: FileList | null } }) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length === 0) return;
      onSelected(files);
      if (inputRef.current) inputRef.current.value = '';
    },
    [onSelected],
  );

  const onDragOver = useCallback((e: DragLikeEvent) => {
    e.preventDefault();
    setHover(true);
  }, []);
  const onDragLeave = useCallback(() => setHover(false), []);
  const onDrop = useCallback(
    (e: DragLikeEvent) => {
      e.preventDefault();
      setHover(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      onSelected(files);
    },
    [onSelected],
  );

  // react-native-web forwards unknown props to the underlying DOM element. We
  // attach drag-and-drop handlers via a typed-loose props object.
  const dndProps = { onDragOver, onDragLeave, onDrop } as unknown as Record<string, unknown>;

  return (
    <Pressable
      onPress={onPickClick}
      accessibilityRole="button"
      accessibilityLabel="Drop files here or click to choose"
      style={[
        styles.container,
        {
          backgroundColor: cardBg,
          borderColor: hover ? accent : dashed,
        },
      ]}
      {...dndProps}>
      <IconSymbol name="arrow.up.circle.fill" size={48} color={accent} />
      <ThemedText type="defaultSemiBold">Drop files here or click to choose</ThemedText>
      <ThemedText style={[styles.hint, { color: tertiary }]}>
        Images, video, and audio. Max 100 MB per file.
      </ThemedText>
      <HiddenFileInput inputRef={inputRef} onChange={onChange} />
    </Pressable>
  );
}

function HiddenFileInput({
  inputRef,
  onChange,
}: {
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  onChange: (e: { target: { files: FileList | null } }) => void;
}) {
  if (typeof window === 'undefined') return null;
  const Input = 'input' as unknown as React.ComponentType<Record<string, unknown>>;
  return (
    <Input
      ref={(node: HTMLInputElement | null) => {
        inputRef.current = node;
      }}
      type="file"
      multiple
      accept="image/*,video/*,audio/*"
      style={{ display: 'none' }}
      onChange={onChange}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    minHeight: 180,
  },
  hint: { fontSize: 12, textAlign: 'center' },
});
