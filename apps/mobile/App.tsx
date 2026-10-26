import React, { useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, Button, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ).replace(/\/+$/, '');
const STORAGE_KEY = 'tilshunos_mobile_session';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

type UserSession = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role: 'student' | 'teacher' | 'admin';
  };
};

type Course = {
  _id: string;
  title: string;
  description?: string;
  isPaid?: boolean;
  price?: number;
  teacherId?: { name?: string } | string | null;
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = await AsyncStorage.getItem(STORAGE_KEY);
  const token = session ? JSON.parse(session).accessToken : null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(Array.isArray(data.message) ? data.message.join(' · ') : data.message || 'So‘rov bajarilmadi');
  }

  return data as T;
}

function saveSession(session: UserSession) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

async function getSession(): Promise<UserSession | null> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value ? JSON.parse(value) : null;
}

function AppShell({ route }: { route?: any }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const current = await getSession();
      setSession(current);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return <AuthStack onAuth={(value) => setSession(value)} />;
  }

  return <MainTabs session={session} onLogout={() => setSession(null)} />;
}

function AuthStack({ onAuth }: { onAuth: (value: UserSession) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setBusy(true);
    setError('');
    try {
      const data = await api<UserSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await saveSession(data);
      onAuth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirishda xatolik yuz berdi');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ email: string; purpose?: string }>(`/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });

      if (result.email) {
        Alert.alert('Tasdiqlash kodi yuborildi', `${result.email} manziliga tasdiqlash kodi yuborildi.`);
        setMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ro‘yxatdan o‘tishda xatolik');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.authContainer}>
        <Text style={styles.title}>{mode === 'login' ? 'Tilshunosga kiring' : 'Hisob oching'}</Text>
        <Text style={styles.subtitle}>Yangi tilni o‘rganishni boshlash uchun tizimga kiring.</Text>

        {mode === 'register' && (
          <TextInput
            placeholder="Ism va familiya"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        )}

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          placeholder="Parol"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        {mode === 'register' && (
          <View style={styles.segmentedControl}>
            <Pressable
              onPress={() => setRole('student')}
              style={[styles.segmentButton, role === 'student' && styles.segmentButtonActive]}
            >
              <Text style={role === 'student' ? styles.segmentTextActive : styles.segmentText}>O‘quvchi</Text>
            </Pressable>
            <Pressable
              onPress={() => setRole('teacher')}
              style={[styles.segmentButton, role === 'teacher' && styles.segmentButtonActive]}
            >
              <Text style={role === 'teacher' ? styles.segmentTextActive : styles.segmentText}>O‘qituvchi</Text>
            </Pressable>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title={busy ? 'Yuklanmoqda...' : mode === 'login' ? 'Kirish' : 'Ro‘yxatdan o‘tish'} onPress={mode === 'login' ? handleLogin : handleRegister} disabled={busy} />

        <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={styles.switchLink}>
          <Text style={styles.switchText}>{mode === 'login' ? 'Hisob yo‘qmi? Ro‘yxatdan o‘ting' : 'Allaqachon hisob bor? Kirish'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function MainTabs({ session, onLogout }: { session: UserSession; onLogout: () => void }) {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" options={{ title: 'Asosiy' }}>
        {() => <HomeScreen session={session} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Courses" options={{ title: 'Kurslar' }}>
        {() => <CoursesScreen session={session} />}
      </Tab.Screen>
      <Tab.Screen name="Profile" options={{ title: 'Profil' }}>
        {() => <ProfileScreen session={session} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function HomeScreen({ session, onLogout }: { session: UserSession; onLogout: () => void }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Salom, {session.user.name || session.user.email}</Text>
      <Text style={styles.smallText}>Tilshunos mobil ilova</Text>
      <Text style={styles.card}>Sizning darajangiz: {session.user.role}</Text>
      <Button title="Chiqish" onPress={async () => { await AsyncStorage.removeItem(STORAGE_KEY); onLogout(); }} />
    </SafeAreaView>
  );
}

function CoursesScreen({ session }: { session: UserSession }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api<Course[]>('/courses');
        setCourses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kurslar yuklanmadi');
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Kurslar</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView>
        {courses.map((course) => (
          <View key={course._id} style={styles.courseCard}>
            <Text style={styles.courseTitle}>{course.title}</Text>
            <Text style={styles.courseMeta}>{typeof course.teacherId === 'object' ? course.teacherId?.name || 'Tilshunos' : 'Tilshunos'}</Text>
            <Text style={styles.courseDescription}>{course.description || 'Kurs haqida ma’lumot yo‘q.'}</Text>
            <Text style={styles.coursePrice}>{course.isPaid ? `${course.price || 0} so‘m` : 'Bepul'}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen({ session, onLogout }: { session: UserSession; onLogout: () => void }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Profil</Text>
      <Text style={styles.card}>Email: {session.user.email}</Text>
      <Text style={styles.card}>Rol: {session.user.role}</Text>
      <Button title="Chiqish" onPress={async () => { await AsyncStorage.removeItem(STORAGE_KEY); onLogout(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f3f7f2' },
  container: { flex: 1, padding: 20, backgroundColor: '#f3f7f2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7f2' },
  authContainer: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f3f7f2' },
  title: { fontSize: 30, fontWeight: '700', marginBottom: 8, color: '#18392a' },
  subtitle: { fontSize: 15, color: '#4a5c52', marginBottom: 20 },
  heading: { fontSize: 28, fontWeight: '700', color: '#18392a', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d4e0d8', borderRadius: 12, padding: 14, marginBottom: 12 },
  segmentedControl: { flexDirection: 'row', marginBottom: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#d4e0d8' },
  segmentButton: { flex: 1, paddingVertical: 12, backgroundColor: '#ffffff' },
  segmentButtonActive: { backgroundColor: '#1f7a4f' },
  segmentText: { textAlign: 'center', color: '#18392a', fontWeight: '600' },
  segmentTextActive: { textAlign: 'center', color: '#fff', fontWeight: '700' },
  error: { color: '#b42318', marginBottom: 12, fontSize: 13 },
  switchLink: { marginTop: 14, alignItems: 'center' },
  switchText: { color: '#1b6d48', fontWeight: '600' },
  smallText: { color: '#4a5c52', fontSize: 16, marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#dfebdf' },
  courseCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#dbebdf' },
  courseTitle: { fontSize: 18, fontWeight: '700', color: '#18392a' },
  courseMeta: { color: '#4a5c52', marginTop: 4, marginBottom: 8 },
  courseDescription: { color: '#2d3a32', lineHeight: 20 },
  coursePrice: { marginTop: 12, fontWeight: '700', color: '#1b6d48' },
});

export default function App() {
  return <AppShell />;
}
