import { Redirect } from 'expo-router';

export default function ProfileIndex() {
  return <Redirect href={{ pathname: '/profile/[username]', params: { username: 'me' } }} />;
}
