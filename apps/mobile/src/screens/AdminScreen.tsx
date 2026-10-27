import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { AppButton, AppScreen, Card, EmptyState, Feedback, palette, ScreenTitle } from '../components/ui';
import { api } from '../lib/api';
import type { AdminUser, Course, CourseAccessRequest, Test } from '../types';
import TeacherCoursesScreen from './TeacherCoursesScreen';

type AdminTab = 'courses' | 'review' | 'access' | 'tests' | 'users' | 'create';
const tabs: { id: AdminTab; label: string }[] = [
  { id: 'courses', label: 'Kurslar' }, { id: 'review', label: 'Tasdiqlashlar' }, { id: 'access', label: 'Kirish so‘rovlari' },
  { id: 'tests', label: 'Testlar' }, { id: 'users', label: 'Foydalanuvchilar' }, { id: 'create', label: 'Kurs qo‘shish' },
];

export default function AdminScreen() {
  const [tab, setTab] = useState<AdminTab>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingCourses, setPendingCourses] = useState<Course[]>([]);
  const [requests, setRequests] = useState<CourseAccessRequest[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    const results = await Promise.allSettled([
      api<Course[]>('/admin/courses'), api<Course[]>('/admin/course-requests'), api<CourseAccessRequest[]>('/admin/access-requests'),
      api<AdminUser[]>('/admin/users'), api<Test[]>('/admin/tests'),
    ]);
    if (results[0].status === 'fulfilled') setCourses(results[0].value);
    if (results[1].status === 'fulfilled') setPendingCourses(results[1].value);
    if (results[2].status === 'fulfilled') setRequests(results[2].value);
    if (results[3].status === 'fulfilled') setUsers(results[3].value);
    if (results[4].status === 'fulfilled') setTests(results[4].value);
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failures.length) setError(failures.map(({ reason }) => reason instanceof Error ? reason.message : 'Admin ma’lumotlarini yuklab bo‘lmadi.').join(' · '));
    setLoading(false);
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);

  const currentData = useMemo(() => tab === 'courses' ? courses : tab === 'review' ? pendingCourses : tab === 'access' ? requests : tab === 'tests' ? tests : tab === 'users' ? users : [], [tab, courses, pendingCourses, requests, tests, users]);

  async function action(path: string, method: string, body?: unknown, success = 'O‘zgarish saqlandi.') {
    setBusy(true); setError(''); setNotice('');
    try { await api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }); setNotice(success); await loadData(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Amalni bajarib bo‘lmadi.'); }
    finally { setBusy(false); }
  }

  async function importTests() {
    setError(''); setNotice('');
    try {
      const selected = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
      if (selected.canceled) return;
      const text = await FileSystem.readAsStringAsync(selected.assets[0].uri);
      const payload: unknown = JSON.parse(text.replace(/^\uFEFF/, ''));
      setBusy(true);
      await api('/admin/tests/import', { method: 'POST', body: JSON.stringify(payload) });
      setNotice('Testlar muvaffaqiyatli yuklandi.');
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'JSON faylni yuklab bo‘lmadi.'); }
    finally { setBusy(false); }
  }

  async function addPresentation(course: Course) {
    setError('');
    try {
      const selected = await DocumentPicker.getDocumentAsync({ type: ['text/html', 'text/plain'], copyToCacheDirectory: true });
      if (selected.canceled) return;
      const file = selected.assets[0];
      if (file.size && file.size > 2 * 1024 * 1024) throw new Error('HTML fayl hajmi 2 MB dan oshmasin.');
      const html = await FileSystem.readAsStringAsync(file.uri);
      await action(`/admin/courses/${course._id}/presentations`, 'POST', { title: file.name, html }, 'Prezentatsiya kursga qo‘shildi.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Prezentatsiyani qo‘shib bo‘lmadi.'); }
  }

  function confirmDelete(title: string, onConfirm: () => void) {
    Alert.alert('O‘chirishni tasdiqlash', `“${title}” ma’lumotini butunlay o‘chirasizmi?`, [
      { text: 'Bekor qilish', style: 'cancel' }, { text: 'O‘chirish', style: 'destructive', onPress: onConfirm },
    ]);
  }

  function renderItem({ item }: { item: Course | CourseAccessRequest | Test | AdminUser }) {
    if (tab === 'courses') {
      const course = item as Course;
      return <Card><Text style={styles.rowTitle}>{course.title}</Text><Text style={styles.detail}>{course.description}</Text><Text style={styles.detail}>{course.teacherId && typeof course.teacherId === 'object' ? course.teacherId.name || 'O‘qituvchi' : 'O‘qituvchi'} · {course.isPaid ? `${course.price || 0} so‘m` : 'Bepul'} · {statusLabel(course.status)}</Text><View style={styles.actions}>
        <Action title="Nashr qilish" onPress={() => action(`/admin/courses/${course._id}/review`, 'PATCH', { status: 'approved' })} />
        <Action title="Yashirish" onPress={() => action(`/admin/courses/${course._id}/review`, 'PATCH', { status: 'hidden' })} />
        <Action danger title="Rad etish" onPress={() => action(`/admin/courses/${course._id}/review`, 'PATCH', { status: 'rejected' })} />
        <Action title={course.isPaid ? 'Bepul qilish' : 'Obunali qilish'} onPress={() => action(`/admin/courses/${course._id}/free`, 'PATCH', { isPaid: !course.isPaid })} />
        <Action title="Prezentatsiya +" onPress={() => addPresentation(course)} />
        <Action danger title="O‘chirish" onPress={() => confirmDelete(course.title, () => action(`/admin/courses/${course._id}`, 'DELETE', undefined, 'Kurs o‘chirildi.'))} />
      </View></Card>;
    }
    if (tab === 'review') {
      const course = item as Course;
      return <Card><Text style={styles.rowTitle}>{course.title}</Text><Text style={styles.detail}>{course.description}</Text><Text style={styles.detail}>O‘qituvchi: {typeof course.teacherId === 'object' ? course.teacherId?.name || '—' : '—'}</Text><View style={styles.actions}>
        <Action title="Tasdiqlash" onPress={() => action(`/admin/courses/${course._id}/review`, 'PATCH', { status: 'approved' })} />
        <Action danger title="Rad etish" onPress={() => action(`/admin/courses/${course._id}/review`, 'PATCH', { status: 'rejected' })} />
      </View></Card>;
    }
    if (tab === 'access') {
      const request = item as CourseAccessRequest;
      return <Card><Text style={styles.rowTitle}>{request.courseId?.title || 'Kurs'}</Text><Text style={styles.detail}>{request.userId?.name || 'O‘quvchi'} · {request.userId?.email || ''}</Text><View style={styles.actions}>
        <Action title="Tasdiqlash" onPress={() => action(`/admin/access-requests/${request._id}`, 'PATCH', { status: 'approved' })} />
        <Action danger title="Rad etish" onPress={() => action(`/admin/access-requests/${request._id}`, 'PATCH', { status: 'rejected' })} />
      </View></Card>;
    }
    if (tab === 'tests') {
      const test = item as Test;
      return <Card><Text style={styles.rowTitle}>{test.title}</Text><Text style={styles.detail}>{test.level} · {test.questionCount || 0} ta savol</Text><Action danger title="Testni o‘chirish" onPress={() => confirmDelete(test.title, () => action(`/tests/${test._id}`, 'DELETE', undefined, 'Test o‘chirildi.'))} /></Card>;
    }
    const user = item as AdminUser;
    return <Card><Text style={styles.rowTitle}>{user.name || '—'}</Text><Text style={styles.detail}>{user.email}</Text><Text style={styles.label}>Foydalanuvchi roli</Text><View style={styles.actions}>{(['student', 'teacher', 'admin'] as const).map((role) => <Action key={role} title={roleLabel(role)} selected={user.role === role} onPress={() => { if (user.role !== role) action(`/admin/users/${user._id}/role`, 'PATCH', { role }); }} />)}</View><Action danger title="Foydalanuvchini o‘chirish" onPress={() => confirmDelete(user.email, () => action(`/admin/users/${user._id}`, 'DELETE', undefined, 'Foydalanuvchi o‘chirildi.'))} /></Card>;
  }

  if (tab === 'create') return <AppScreen style={styles.screen}><TeacherCoursesScreen role="admin" /></AppScreen>;

  const header = <>
    <ScreenTitle title="Admin boshqaruvi" subtitle="Platforma, kurslar va foydalanuvchilarni boshqaring." />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{tabs.map((item) => <Pressable key={item.id} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabActive]}><Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}{item.id === 'review' ? ` (${pendingCourses.length})` : item.id === 'access' ? ` (${requests.length})` : ''}</Text></Pressable>)}</ScrollView>
    <Feedback message={error} /><Feedback message={notice} variant="success" />
    {tab === 'tests' ? <AppButton title="JSON test faylini tanlash" loading={busy} onPress={importTests} /> : null}
  </>;

  return <AppScreen style={styles.screen}><FlatList
    data={currentData as (Course | CourseAccessRequest | Test | AdminUser)[]}
    keyExtractor={(item) => item._id}
    contentContainerStyle={styles.list}
    refreshing={loading || busy}
    onRefresh={() => loadData()}
    ListHeaderComponent={header}
    ListEmptyComponent={loading ? <View style={styles.loading}><ActivityIndicator color={palette.green} /></View> : <EmptyState title={emptyTitle(tab)} detail="Yangi ma’lumot qo‘shilgach shu yerda ko‘rinadi." />}
    renderItem={renderItem}
  /></AppScreen>;
}

function Action({ title, onPress, danger = false, selected = false }: { title: string; onPress: () => void; danger?: boolean; selected?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.action, selected && styles.selectedAction, danger && styles.dangerAction]}><Text style={[styles.actionText, selected && styles.selectedActionText, danger && styles.dangerText]}>{title}</Text></Pressable>;
}
function roleLabel(role: AdminUser['role']) { return role === 'student' ? 'O‘quvchi' : role === 'teacher' ? 'O‘qituvchi' : 'Admin'; }
function statusLabel(status: Course['status']) { return status === 'approved' ? 'Nashr qilingan' : status === 'pending' ? 'Ko‘rib chiqilmoqda' : status === 'hidden' ? 'Yashirilgan' : status === 'rejected' ? 'Rad etilgan' : 'Noma’lum'; }
function emptyTitle(tab: AdminTab) { return tab === 'review' ? 'Tasdiqlash uchun kurslar yo‘q' : tab === 'access' ? 'Kirish so‘rovlari yo‘q' : tab === 'tests' ? 'Testlar yo‘q' : tab === 'users' ? 'Foydalanuvchilar topilmadi' : 'Kurslar topilmadi'; }

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16 }, list: { paddingBottom: 26 }, tabs: { gap: 8, paddingVertical: 8, paddingBottom: 12 }, tab: { borderWidth: 1, borderColor: palette.border, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#fff' }, tabActive: { backgroundColor: palette.green, borderColor: palette.green }, tabText: { color: palette.ink, fontSize: 12, fontWeight: '700' }, tabTextActive: { color: '#fff' },
  rowTitle: { color: palette.ink, fontWeight: '700', fontSize: 16 }, detail: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 5 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 5 }, action: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: '#bdd4c1', backgroundColor: '#edf6ef' }, actionText: { color: palette.green, fontSize: 12, fontWeight: '700' }, selectedAction: { backgroundColor: palette.green }, selectedActionText: { color: '#fff' }, dangerAction: { borderColor: '#e3c4c0', backgroundColor: '#fff5f3' }, dangerText: { color: '#a43d35' }, label: { color: palette.ink, fontSize: 12, fontWeight: '700', marginTop: 12 }, loading: { padding: 28, alignItems: 'center' },
});
