import { useLocalSearchParams } from 'expo-router';

import { LibraryGrid } from '@/features/content-library';

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <LibraryGrid username={username ?? 'me'} />;
}
