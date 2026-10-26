import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'tilshunos_access_token';
const USER_KEY = 'tilshunos_session_user';

export type UserRole = 'student' | 'teacher' | 'admin';
export type Session = {
  accessToken: string;
  user: { id: string; email: string; name?: string; role: UserRole; avatarUrl?: string };
};

export async function saveSession(session: Session): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, session.accessToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function getStoredSession(): Promise<Session | null> {
  const [accessToken, userJson] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  if (!accessToken || !userJson) return null;
  try {
    return { accessToken, user: JSON.parse(userJson) as Session['user'] };
  } catch {
    await clearSession();
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearSession(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
}
