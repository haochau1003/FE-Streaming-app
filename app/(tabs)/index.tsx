import { Redirect } from 'expo-router';

// The default tab is the Streams feed. Keeping a thin redirect here means
// any link to `/(tabs)` or `/` lands somewhere meaningful instead of 404-ing,
// without duplicating the streams screen.
export default function Index() {
  return <Redirect href="/streams" />;
}
