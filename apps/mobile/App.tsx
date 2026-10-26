import { ComponentType, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ApiError, configureUnauthorizedHandler } from './src/lib/api';
import { getStoredSession, clearSession, type Session } from './src/lib/session';
import { LoginScreen, RegisterScreen, type AuthRoutes } from './src/screens/AuthScreens';
import type { CourseRoutes, MainTabRoutes, TestRoutes } from './src/types';
import CourseCatalogScreen from './src/screens/CourseCatalogScreen';
import CourseDetailScreen from './src/screens/CourseDetailScreen';
import TestCatalogScreen from './src/screens/TestCatalogScreen';
import TestTakeScreen from './src/screens/TestTakeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import TeacherManagementScreen from './src/screens/TeacherManagementScreen';

const Auth = createNativeStackNavigator<AuthRoutes>();
const Tabs = createBottomTabNavigator<MainTabRoutes>();
const CourseStack = createNativeStackNavigator<CourseRoutes>();
const TestStack = createNativeStackNavigator<TestRoutes>();
// React Navigation resolves React types through hoisted workspace packages; cast
// its runtime navigator components to the app's React 18 component type.
const AuthNavigatorView = Auth.Navigator as unknown as ComponentType<any>;
const TabsNavigatorView = Tabs.Navigator as unknown as ComponentType<any>;
const NavigationRoot = NavigationContainer as unknown as ComponentType<any>;
const CourseStackView = CourseStack.Navigator as unknown as ComponentType<any>;
const TestStackView = TestStack.Navigator as unknown as ComponentType<any>;

function Placeholder({ title }: { title: string }) {
  return <View style={styles.screen}><Text style={styles.title}>{title}</Text><Text style={styles.copy}>Bu bo‘lim keyingi bosqichlarda tayyorlanadi.</Text></View>;
}

function AuthNavigator({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  return <AuthNavigatorView screenOptions={{ headerShown: false }}>
    <Auth.Screen name="Login">{(props) => <LoginScreen {...props} onAuthenticated={onAuthenticated} />}</Auth.Screen>
    <Auth.Screen name="Register">{(props) => <RegisterScreen {...props} onAuthenticated={onAuthenticated} />}</Auth.Screen>
  </AuthNavigatorView>;
}

function RoleTabs({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const teacher = session.user.role === 'teacher';
  const admin = session.user.role === 'admin';
  return <TabsNavigatorView screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="Home" options={{ title: 'Asosiy' }}>{(props) => <HomeScreen {...props} session={session} />}</Tabs.Screen>
    <Tabs.Screen name="Courses" options={{ title: 'Kurslar' }}>{() => <CourseNavigator role={session.user.role} />}</Tabs.Screen>
    <Tabs.Screen name="Tests" options={{ title: 'Testlar' }}>{() => <TestNavigator />}</Tabs.Screen>
    {(teacher || admin) && <Tabs.Screen name="Manage" options={{ title: 'Boshqaruv' }}>{() => teacher ? <TeacherManagementScreen /> : <Placeholder title="Admin boshqaruvi" />}</Tabs.Screen>}
    <Tabs.Screen name="Profile" options={{ title: 'Profil' }}>{() => <ProfileScreen session={session} onLogout={onLogout} />}</Tabs.Screen>
  </TabsNavigatorView>;
}

function CourseNavigator({ role }: { role: Session['user']['role'] }) {
  return <CourseStackView><CourseStack.Screen name="Catalog" options={{ title: 'Kurslar' }} component={CourseCatalogScreen} /><CourseStack.Screen name="Detail" options={{ title: 'Kurs tafsiloti' }}>{(props) => <CourseDetailScreen {...props} role={role} />}</CourseStack.Screen></CourseStackView>;
}

function TestNavigator() {
  return <TestStackView><TestStack.Screen name="Catalog" options={{ title: 'Testlar' }} component={TestCatalogScreen} /><TestStack.Screen name="Take" options={{ title: 'Testni ishlash' }} component={TestTakeScreen} /></TestStackView>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getStoredSession().then((stored) => { if (active) setSession(stored); }).finally(() => { if (active) setReady(true); });
    configureUnauthorizedHandler(async (error) => {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
        if (active) setSession(null);
      }
    });
    return () => { active = false; configureUnauthorizedHandler(undefined); };
  }, []);

  if (!ready) return <View style={styles.loading}><ActivityIndicator size="large" color="#1b6d48" /></View>;
  return <SafeAreaProvider><StatusBar style="dark" /><NavigationRoot key={session?.user.role || 'guest'}>
    {session ? <RoleTabs session={session} onLogout={async () => { await clearSession(); setSession(null); }} /> : <AuthNavigator onAuthenticated={setSession} />}
  </NavigationRoot></SafeAreaProvider>;
}

const styles = StyleSheet.create({ loading: { flex: 1, justifyContent: 'center', alignItems: 'center' }, screen: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#f3f7f2' }, title: { color: '#18392a', fontSize: 26, fontWeight: '700' }, copy: { color: '#4a5c52', marginTop: 8, fontSize: 15 } });
