import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, AppInput, AppScreen, Card, Feedback, palette, ScreenTitle } from '../components/ui';
import { api } from '../lib/api';
import { saveSession, type Session } from '../lib/session';

type Profile = { _id?: string; id?: string; name: string; email: string; role: Session['user']['role']; avatarUrl?: string };
type Props = { session: Session; onLogout: () => void };

export default function ProfileScreen({ session, onLogout }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState(session.user.name || '');
  const [avatarUrl, setAvatarUrl] = useState(session.user.avatarUrl || '');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api<Profile>('/auth/me').then((data) => {
      if (!active) return;
      setProfile(data);
      setName(data.name || '');
      setAvatarUrl(data.avatarUrl || '');
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : 'Profil ma’lumotlarini yuklab bo‘lmadi.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const initials = useMemo(() => (name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || 'U').toUpperCase(), [name]);

  async function save() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await api<Profile>('/auth/me', { method: 'PATCH', body: JSON.stringify({ name: name.trim(), avatarUrl: avatarUrl.trim() }) });
      setProfile(updated);
      setName(updated.name || '');
      setAvatarUrl(updated.avatarUrl || '');
      setImageFailed(false);
      await saveSession({ ...session, user: { ...session.user, name: updated.name, avatarUrl: updated.avatarUrl } });
      setNotice('Profil ma’lumotlari saqlandi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profilni saqlab bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <AppScreen><View style={styles.center}><ActivityIndicator size="large" color={palette.green} /><Text style={styles.muted}>Profil yuklanmoqda...</Text></View></AppScreen>;

  return <AppScreen style={styles.screen}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenTitle title="Profilni tahrirlash" subtitle="Ismingiz va profil rasmingizni yangilang." />
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            {avatarUrl && !imageFailed ? <Image source={{ uri: avatarUrl }} style={styles.image} onError={() => setImageFailed(true)} /> : <Text style={styles.initials}>{initials}</Text>}
          </View>
          <Text style={styles.role}>{roleLabel(profile?.role || session.user.role)}</Text>
        </Card>
        <AppInput label="Ism va familiya" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" placeholder="Ismingiz" />
        <AppInput label="Email" value={profile?.email || session.user.email} editable={false} />
        <AppInput label="Profil rasmi havolasi (HTTPS)" value={avatarUrl} onChangeText={(value) => { setAvatarUrl(value); setImageFailed(false); }} autoCapitalize="none" keyboardType="url" placeholder="https://..." />
        <Feedback message={error} />
        <Feedback message={notice} variant="success" />
        <AppButton title="O‘zgarishlarni saqlash" loading={busy} disabled={name.trim().length < 2} onPress={save} />
        <View style={styles.logout}><AppButton title="Chiqish" variant="secondary" onPress={onLogout} /></View>
      </ScrollView>
    </KeyboardAvoidingView>
  </AppScreen>;
}

function roleLabel(role: Session['user']['role']) {
  return role === 'admin' ? 'Administrator' : role === 'teacher' ? 'O‘qituvchi' : 'O‘quvchi';
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16 }, flex: { flex: 1 }, content: { paddingBottom: 22 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, muted: { color: palette.muted, fontSize: 14 },
  profileCard: { alignItems: 'center', paddingVertical: 20, marginBottom: 19 }, avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#e6f0e7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, image: { width: '100%', height: '100%' }, initials: { color: palette.green, fontSize: 25, fontWeight: '800' }, role: { color: '#617167', marginTop: 9, fontSize: 13, fontWeight: '600' }, logout: { marginTop: 10 },
});
