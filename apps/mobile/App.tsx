import { ComponentType, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ApiError, configureUnauthorizedHandler } from './src/lib/api';
import { getStoredSession, clearSession, type Session } from './src/lib/session';
import { LoginScreen, RegisterScreen, type AuthRoutes } from './src/screens/AuthScreens';
import type { CourseRoutes, GuestTabRoutes, MainTabRoutes, TestRoutes } from './src/types';
import CourseCatalogScreen from './src/screens/CourseCatalogScreen';
import CourseDetailScreen from './src/screens/CourseDetailScreen';
import TestCatalogScreen from './src/screens/TestCatalogScreen';
import TestTakeScreen from './src/screens/TestTakeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import TeacherManagementScreen from './src/screens/TeacherManagementScreen';
import AdminScreen from './src/screens/AdminScreen';

const Auth = createNativeStackNavigator<AuthRoutes>();
const Tabs = createBottomTabNavigator<MainTabRoutes>();
const GuestTabs = createBottomTabNavigator<GuestTabRoutes>();
const CourseStack = createNativeStackNavigator<CourseRoutes>();
const TestStack = createNativeStackNavigator<TestRoutes>();
// React Navigation resolves React types through hoisted workspace packages; cast
// its runtime navigator components to the app's React 18 component type.
const AuthNavigatorView = Auth.Navigator as unknown as ComponentType<any>;
const TabsNavigatorView = Tabs.Navigator as unknown as ComponentType<any>;
const GuestTabsNavigatorView = GuestTabs.Navigator as unknown as ComponentType<any>;
const NavigationRoot = NavigationContainer as unknown as ComponentType<any>;
const CourseStackView = CourseStack.Navigator as unknown as ComponentType<any>;
const TestStackView = TestStack.Navigator as unknown as ComponentType<any>;

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
    <Tabs.Screen name="Courses" options={{ title: 'Kurslar' }}>{() => <CourseNavigator role={session.user.role} authenticated />}</Tabs.Screen>
    <Tabs.Screen name="Tests" options={{ title: 'Testlar' }}>{() => <TestNavigator />}</Tabs.Screen>
    {(teacher || admin) && <Tabs.Screen name="Manage" options={{ title: 'Boshqaruv' }}>{() => teacher ? <TeacherManagementScreen /> : <AdminScreen />}</Tabs.Screen>}
    <Tabs.Screen name="Profile" options={{ title: 'Profil' }}>{() => <ProfileScreen session={session} onLogout={onLogout} />}</Tabs.Screen>
  </TabsNavigatorView>;
}

function GuestTabsScreen({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  return <GuestTabsNavigatorView screenOptions={{ headerShown: false }}>
    <GuestTabs.Screen name="Home" options={{ title: 'Asosiy' }}>{(props) => <HomeScreen {...props} />}</GuestTabs.Screen>
    <GuestTabs.Screen name="Courses" options={{ title: 'Kurslar' }}>{() => <CourseNavigator role="student" authenticated={false} />}</GuestTabs.Screen>
    <GuestTabs.Screen name="Tests" options={{ title: 'Testlar' }}>{() => <TestNavigator />}</GuestTabs.Screen>
    <GuestTabs.Screen name="Login" options={{ title: 'Kirish' }}>{() => <AuthNavigator onAuthenticated={onAuthenticated} />}</GuestTabs.Screen>
  </GuestTabsNavigatorView>;
}

function CourseNavigator({ role, authenticated }: { role: Session['user']['role']; authenticated: boolean }) {
  return <CourseStackView><CourseStack.Screen name="Catalog" options={{ title: 'Kurslar' }} component={CourseCatalogScreen} /><CourseStack.Screen name="Detail" options={{ title: 'Kurs tafsiloti' }}>{(props) => <CourseDetailScreen {...props} role={role} authenticated={authenticated} />}</CourseStack.Screen></CourseStackView>;
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
    {session ? <RoleTabs session={session} onLogout={async () => { await clearSession(); setSession(null); }} /> : <GuestTabsScreen onAuthenticated={setSession} />}
  </NavigationRoot></SafeAreaProvider>;
}

const styles = StyleSheet.create({ loading: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
