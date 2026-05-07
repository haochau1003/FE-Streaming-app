import { useLocalSearchParams } from 'expo-router';

import { SingleItemView } from '@/features/content-library';

export default function LibraryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <SingleItemView id={id} />;
}
