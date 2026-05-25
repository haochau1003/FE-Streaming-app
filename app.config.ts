import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'streaming-app',
  slug: config.slug ?? 'streaming-app',
  // LiveKit needs a custom dev client (WebRTC native modules can't run in Expo Go).
  // @config-plugins/react-native-webrtc wires the iOS/Android camera+mic permissions;
  // @livekit/react-native-expo-plugin registers the LiveKit native modules.
  plugins: [
    ...(config.plugins ?? []),
    '@config-plugins/react-native-webrtc',
    '@livekit/react-native-expo-plugin',
  ],
  extra: {
    ...(config.extra ?? {}),
    API_BASE: process.env.API_BASE ?? 'http://localhost:5001',
    SOCKET_URL: process.env.SOCKET_URL ?? process.env.API_BASE ?? 'http://localhost:5001',
    MEDIA_MAX_SIZE_MB: Number(process.env.MEDIA_MAX_SIZE_MB ?? 100),
    MEDIA_QUOTA_MB_PER_USER: Number(process.env.MEDIA_QUOTA_MB_PER_USER ?? 1024),
    MEDIA_ALLOWED_MIMETYPES: (
      process.env.MEDIA_ALLOWED_MIMETYPES ??
      'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg,audio/mpeg,audio/ogg,audio/wav'
    )
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean),
    MEDIA_PRESIGNED_TTL_SECONDS: Number(process.env.MEDIA_PRESIGNED_TTL_SECONDS ?? 300),
    MEDIA_UPLOAD_LIMIT_PER_MINUTE: Number(process.env.MEDIA_UPLOAD_LIMIT_PER_MINUTE ?? 10),
  },
});
