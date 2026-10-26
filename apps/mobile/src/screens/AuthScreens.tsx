import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { saveSession, type Session, type UserRole } from '../lib/session';

export type AuthRoutes = { Login: undefined; Register: undefined };
type LoginProps = NativeStackScreenProps<AuthRoutes, 'Login'> & { onAuthenticated: (session: Session) => void };
type RegisterProps = NativeStackScreenProps<AuthRoutes, 'Register'> & { onAuthenticated: (session: Session) => void };
type SessionResponse = Session;
type RegisterResponse = { verificationRequired: true; email: string; purpose: 'register' | 'login' };

export function LoginScreen({ navigation, onAuthenticated }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const session = await api<SessionResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      await saveSession(session);
      onAuthenticated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirish amalga oshmadi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  }

  return <AuthFrame eyebrow="XUSH KELIBSIZ" title="Hisobingizga kiring." description="O‘rganishni davom ettirish uchun email va parolingizni kiriting.">
    <Field label="Email" value={email} onChangeText={setEmail} placeholder="siz@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <Field label="Parol" value={password} onChangeText={setPassword} placeholder="Parolingiz" secureTextEntry autoComplete="current-password" />
    <ErrorText>{error}</ErrorText>
    <PrimaryButton title="Kirish" busy={busy} onPress={submit} />
    <View style={styles.footerRow}><Text style={styles.muted}>Hisobingiz yo‘qmi?</Text><Pressable onPress={() => navigation.navigate('Register')}><Text style={styles.link}>Ro‘yxatdan o‘ting</Text></Pressable></View>
  </AuthFrame>;
}

export function RegisterScreen({ navigation, onAuthenticated }: RegisterProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Extract<UserRole, 'student' | 'teacher'>>('student');
  const [code, setCode] = useState('');
  const [purpose, setPurpose] = useState<'register' | 'login'>('register');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, role }),
      });
      setPurpose(result.purpose);
      setVerificationEmail(result.email);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod yuborilmadi. Ma’lumotlarni tekshiring.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const session = await api<SessionResponse>('/auth/verify-registration', {
        method: 'POST',
        body: JSON.stringify({ email: verificationEmail, code: code.trim() }),
      });
      await saveSession(session);
      onAuthenticated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod tasdiqlanmadi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/auth/resend-registration-code', {
        method: 'POST',
        body: JSON.stringify({ email: verificationEmail }),
      });
      setNotice('Yangi kod emailingizga yuborildi.');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kodni qayta yuborib bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  }

  function editDetails() {
    setVerificationEmail('');
    setCode('');
    setError('');
    setNotice('');
  }

  if (verificationEmail) {
    return <AuthFrame eyebrow="EMAILNI TASDIQLASH" title={purpose === 'login' ? 'Kirishni tasdiqlang.' : 'Emailingizni tasdiqlang.'} description={`${verificationEmail} manziliga 6 xonali kod yubordik. Kod 10 daqiqa amal qiladi.`}>
      <Field label="Tasdiqlash kodi" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />
      <ErrorText>{error}</ErrorText>
      {notice ? <Text style={styles.success}>{notice}</Text> : null}
      <PrimaryButton title={purpose === 'login' ? 'Kirishni davom ettirish' : 'Emailni tasdiqlash'} busy={busy} disabled={code.length !== 6} onPress={verifyCode} />
      <Pressable disabled={busy} onPress={resendCode} style={styles.secondaryAction}><Text style={styles.link}>{busy ? 'Kutilmoqda...' : 'Kodni qayta yuborish'}</Text></Pressable>
      <Pressable disabled={busy} onPress={editDetails} style={styles.secondaryAction}><Text style={styles.muted}>Emailni o‘zgartirish</Text></Pressable>
    </AuthFrame>;
  }

  return <AuthFrame eyebrow="TILSHUNOSGA XUSH KELIBSIZ" title="Yo‘lingizni boshlang." description="Hisob turini tanlang. Yangi email ro‘yxatdan o‘tish, mavjud email esa kod bilan kirish uchun ishlatiladi.">
    <Text style={styles.fieldLabel}>Men...</Text>
    <View style={styles.rolePicker}>
      <RoleChoice title="O‘quvchi" detail="Kurslarni o‘rganaman" selected={role === 'student'} onPress={() => setRole('student')} />
      <RoleChoice title="O‘qituvchi" detail="Kurs yarataman" selected={role === 'teacher'} onPress={() => setRole('teacher')} />
    </View>
    <Field label="Ism va familiya" value={name} onChangeText={setName} placeholder="Ismingiz" autoCapitalize="words" autoComplete="name" />
    <Field label="Email" value={email} onChangeText={setEmail} placeholder="siz@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <Field label="Parol" value={password} onChangeText={setPassword} placeholder="Kamida 8 belgi" secureTextEntry autoComplete="new-password" />
    <ErrorText>{error}</ErrorText>
    <PrimaryButton title="Tasdiqlash kodini yuborish" busy={busy} onPress={requestCode} />
    <View style={styles.footerRow}><Text style={styles.muted}>Hisobingiz bormi?</Text><Pressable onPress={() => navigation.navigate('Login')}><Text style={styles.link}>Kirish</Text></Pressable></View>
  </AuthFrame>;
}

function AuthFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} placeholderTextColor="#89958d" style={styles.input} returnKeyType="next" /></View>;
}

function RoleChoice({ title, detail, selected, onPress }: { title: string; detail: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.roleChoice, selected && styles.roleChoiceSelected]}>
    <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>{title}</Text>
    <Text style={[styles.roleDetail, selected && styles.roleDetailSelected]}>{detail}</Text>
  </Pressable>;
}

function PrimaryButton({ title, busy, disabled, onPress }: { title: string; busy: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={onPress} style={[styles.primaryButton, (busy || disabled) && styles.buttonDisabled]}>
    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{title}</Text>}
  </Pressable>;
}

function ErrorText({ children }: { children: string }) {
  return children ? <Text accessibilityRole="alert" style={styles.error}>{children}</Text> : null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f7f2' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 22, padding: 24, borderWidth: 1, borderColor: '#e4ebe5' },
  eyebrow: { color: '#52735c', fontSize: 11, fontWeight: '800', letterSpacing: 1.3, marginBottom: 10 },
  title: { color: '#18392a', fontSize: 29, lineHeight: 36, fontWeight: '700' },
  description: { color: '#5a685f', fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 22 },
  field: { marginBottom: 15 },
  fieldLabel: { color: '#293a30', fontSize: 14, fontWeight: '600', marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#d5e0d8', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, color: '#1d3024', fontSize: 16 },
  rolePicker: { flexDirection: 'row', gap: 10, marginBottom: 17 },
  roleChoice: { flex: 1, minHeight: 72, justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: '#d5e0d8', borderRadius: 12, backgroundColor: '#fff' },
  roleChoiceSelected: { borderColor: '#1b6d48', backgroundColor: '#edf6ef' },
  roleTitle: { color: '#33443a', fontWeight: '700', fontSize: 15 },
  roleTitleSelected: { color: '#1b6d48' },
  roleDetail: { color: '#78857d', fontSize: 12, marginTop: 4 },
  roleDetailSelected: { color: '#52735c' },
  primaryButton: { minHeight: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1b6d48', marginTop: 3 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  error: { color: '#b42318', fontSize: 14, lineHeight: 20, marginBottom: 13 },
  success: { color: '#1b6d48', fontSize: 14, marginBottom: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 19, flexWrap: 'wrap' },
  muted: { color: '#68766d', fontSize: 14 },
  link: { color: '#1b6d48', fontSize: 14, fontWeight: '700' },
  secondaryAction: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 8 },
});
