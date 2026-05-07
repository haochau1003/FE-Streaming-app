import * as DocumentPicker from 'expo-document-picker';

import type { NativeFileSource } from '../api/upload';

export interface PickerResult {
  files: NativeFileSource[];
  cancelled: boolean;
}

export async function pickMedia(): Promise<PickerResult> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'video/*', 'audio/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (res.canceled) return { files: [], cancelled: true };

  const files: NativeFileSource[] = res.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    size: asset.size,
  }));
  return { files, cancelled: false };
}
