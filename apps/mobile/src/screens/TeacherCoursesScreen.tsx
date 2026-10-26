import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppButton, AppInput, Card, EmptyState, Feedback, palette, ScreenTitle } from '../components/ui';
import { api } from '../lib/api';
import type { Session } from '../lib/session';
import type { Course } from '../types';

type LessonDraft = { title: string; videoUrl: string; content: string };
type SlideDraft = { name: string; dataUrl: string };
const blankLesson = (): LessonDraft => ({ title: '', videoUrl: '', content: '' });

export default function TeacherCoursesScreen({ role = 'teacher' }: { role?: Session['user']['role'] }) {
  const isAdmin = role === 'admin';
  const [courses, setCourses] = useState<Course[]>([]);
  const [editing, setEditing] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('0');
  const [lessons, setLessons] = useState<LessonDraft[]>([blankLesson()]);
  const [slides, setSlides] = useState<SlideDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCourses = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    try { setCourses(await api<Course[]>('/courses/mine')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Kurslaringizni yuklab bo‘lmadi.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void loadCourses(); }, [loadCourses]);

  function resetForm() {
    setEditing(null); setTitle(''); setDescription(''); setCoverUrl(''); setIsPaid(false); setPrice('0'); setLessons([blankLesson()]); setSlides([]); setError('');
  }

  function startEdit(course: Course) {
    setEditing(course); setTitle(course.title); setDescription(course.description || ''); setCoverUrl(course.coverUrl || ''); setIsPaid(course.isPaid); setPrice(String(course.price || 0)); setSlides([]);
    const existing = course.sections?.flatMap((section) => section.lessons || []).map((lesson) => ({ title: lesson.title, videoUrl: lesson.videoUrl || '', content: lesson.content || '' }));
    setLessons(existing?.length ? existing : [blankLesson()]);
    setError(''); setNotice('');
  }

  function updateLesson(index: number, key: keyof LessonDraft, value: string) {
    setLessons((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item));
  }

  async function pickSlides() {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const selected = result.assets;
      const total = selected.reduce((sum, file) => sum + (file.size || 0), 0);
      if (total > 5 * 1024 * 1024) throw new Error('PDF slaydlarining umumiy hajmi 5 MB dan oshmasin.');
      const items = await Promise.all(selected.map(async (file) => ({ name: file.name, dataUrl: `data:application/pdf;base64,${await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 })}` })));
      setSlides((current) => [...current, ...items]);
    } catch (err) { setError(err instanceof Error ? err.message : 'PDF faylni tanlab bo‘lmadi.'); }
  }

  async function saveCourse() {
    setBusy(true); setError(''); setNotice('');
    try {
      const validLessons = lessons.filter((lesson) => lesson.title.trim()).map((lesson) => ({ title: lesson.title.trim(), videoUrl: lesson.videoUrl.trim(), content: lesson.content.trim() }));
      if (!validLessons.length) throw new Error('Kamida bitta dars nomini kiriting.');
      const payload: Record<string, unknown> = { title: title.trim(), description: description.trim(), coverUrl: coverUrl.trim(), isPaid, price: Number(price || 0), sections: [{ title: 'Kurs darslari', lessons: validLessons }] };
      if (slides.length) payload.slides = slides;
      await api(editing ? `/courses/${editing._id}` : '/courses', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      setNotice(isAdmin ? (editing ? 'Kurs yangilandi va katalogda nashr qilindi.' : 'Kurs yaratildi va katalogda nashr qilindi.') : (editing ? 'Kurs yangilandi va qayta ko‘rib chiqishga yuborildi.' : 'Kurs adminga ko‘rib chiqish uchun yuborildi.'));
      resetForm();
      await loadCourses();
    } catch (err) { setError(err instanceof Error ? err.message : 'Kursni saqlab bo‘lmadi.'); }
    finally { setBusy(false); }
  }

  function deleteCourse(course: Course) {
    Alert.alert('Kursni o‘chirish', `“${course.title}” kursini butunlay o‘chirasizmi?`, [
      { text: 'Bekor qilish', style: 'cancel' },
      { text: 'O‘chirish', style: 'destructive', onPress: async () => {
        setError('');
        try { await api(`/courses/${course._id}`, { method: 'DELETE' }); setNotice('Kurs o‘chirildi.'); await loadCourses(); }
        catch (err) { setError(err instanceof Error ? err.message : 'Kursni o‘chirib bo‘lmadi.'); }
      } },
    ]);
  }

  const header = <>
    <ScreenTitle title={editing ? 'Kursni tahrirlash' : isAdmin ? 'Kurslar' : 'Kurslarim'} subtitle={isAdmin ? 'Kurs yarating, tahrirlang va katalog holatini boshqaring.' : 'Kurs yarating, tahrirlang va moderatsiya holatini kuzating.'} />
    <Feedback message={error} />
    <Feedback message={notice} variant="success" />
    <Card style={styles.formCard}>
      <Text style={styles.formTitle}>{editing ? 'Kurs ma’lumotlari' : 'Yangi kurs yarating'}</Text>
      <AppInput label="Kurs nomi" value={title} onChangeText={setTitle} placeholder="Masalan: Ingliz tili A1" />
      <AppInput label="Tavsif" value={description} onChangeText={setDescription} placeholder="Kurs nimalarni o‘rgatadi?" multiline style={styles.multiline} />
      <AppInput label="Muqova havolasi yoki emoji" value={coverUrl} onChangeText={setCoverUrl} placeholder="🌍 yoki https://..." />
      <Text style={styles.label}>Kurs turi</Text>
      <View style={styles.segment}>{[false, true].map((paid) => <Pressable key={String(paid)} onPress={() => setIsPaid(paid)} style={[styles.segmentButton, isPaid === paid && styles.segmentActive]}><Text style={[styles.segmentText, isPaid === paid && styles.segmentTextActive]}>{paid ? 'Obunali' : 'Bepul'}</Text></Pressable>)}</View>
      {isPaid ? <AppInput label="Narx (so‘m)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" /> : null}
      <Text style={styles.label}>Darslar</Text>
      {lessons.map((lesson, index) => <View key={index} style={styles.lessonDraft}>
        <Text style={styles.lessonHeading}>Dars {index + 1}</Text>
        <AppInput label="Dars nomi" value={lesson.title} onChangeText={(value) => updateLesson(index, 'title', value)} placeholder="Dars sarlavhasi" />
        <AppInput label="Video havolasi" value={lesson.videoUrl} onChangeText={(value) => updateLesson(index, 'videoUrl', value)} placeholder="https://..." autoCapitalize="none" />
        <AppInput label="Dars matni" value={lesson.content} onChangeText={(value) => updateLesson(index, 'content', value)} placeholder="Dars mazmuni" multiline style={styles.multiline} />
        {lessons.length > 1 ? <Pressable onPress={() => setLessons((current) => current.filter((_, i) => i !== index))}><Text style={styles.remove}>Darsni olib tashlash</Text></Pressable> : null}
      </View>)}
      <AppButton title="+ Dars qo‘shish" variant="secondary" onPress={() => setLessons((current) => [...current, blankLesson()])} />
      <View style={styles.slidesRow}><Text style={styles.label}>PDF slaydlar (jami 5 MB gacha)</Text><AppButton title="PDF tanlash" variant="secondary" onPress={pickSlides} /></View>
      {slides.map((slide, index) => <Text key={`${slide.name}-${index}`} style={styles.fileName}>✓ {slide.name}</Text>)}
      <AppButton title={isAdmin ? editing ? 'Saqlash va nashr qilish' : 'Yaratish va nashr qilish' : editing ? 'Saqlash va qayta yuborish' : 'Tasdiqqa yuborish'} loading={busy} disabled={title.trim().length < 2 || description.trim().length < 1} onPress={saveCourse} />
      {editing ? <View style={styles.cancel}><AppButton title="Tahrirlashni bekor qilish" variant="secondary" onPress={resetForm} /></View> : null}
    </Card>
    <Text style={styles.listTitle}>Yaratilgan kurslar</Text>
  </>;

  return <FlatList
    data={courses}
    keyExtractor={(course) => course._id}
    contentContainerStyle={styles.list}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCourses(true)} tintColor={palette.green} />}
    ListHeaderComponent={header}
    ListEmptyComponent={loading ? <View style={styles.center}><ActivityIndicator color={palette.green} /></View> : <EmptyState title="Hozircha kurs yo‘q" detail="Yuqoridagi formadan yangi kurs qo‘shing." />}
    renderItem={({ item }) => <Card style={styles.courseCard}>
      <Text style={styles.courseTitle}>{item.title}</Text><Text style={styles.courseDescription}>{item.description}</Text>
      <Text style={[styles.status, item.status === 'pending' && styles.pending]}>{item.status === 'pending' ? 'Ko‘rib chiqilmoqda' : item.status === 'approved' ? 'Nashr qilingan' : item.status || 'Holat ko‘rsatilmagan'}</Text>
      <View style={styles.actions}><Pressable onPress={() => startEdit(item)}><Text style={styles.link}>Tahrirlash</Text></Pressable><Pressable onPress={() => deleteCourse(item)}><Text style={styles.remove}>O‘chirish</Text></Pressable></View>
    </Card>}
  />;
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 28 }, formCard: { marginTop: 2 }, formTitle: { color: palette.ink, fontSize: 18, fontWeight: '700', marginBottom: 15 }, multiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }, label: { color: '#293a30', fontSize: 14, fontWeight: '600', marginBottom: 8 }, segment: { flexDirection: 'row', borderRadius: 11, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, marginBottom: 15 }, segmentButton: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#fff' }, segmentActive: { backgroundColor: palette.green }, segmentText: { color: palette.ink, fontWeight: '700' }, segmentTextActive: { color: '#fff' }, lessonDraft: { borderTopWidth: 1, borderTopColor: '#e7eee8', paddingTop: 13, marginBottom: 8 }, lessonHeading: { color: palette.ink, fontWeight: '700', marginBottom: 10 }, remove: { color: '#a43d35', fontSize: 13, fontWeight: '700', paddingVertical: 8 }, slidesRow: { marginTop: 15, marginBottom: 8, gap: 4 }, fileName: { color: palette.green, fontSize: 12, marginBottom: 5 }, cancel: { marginTop: 9 }, listTitle: { color: palette.ink, fontSize: 19, fontWeight: '700', marginVertical: 12 }, courseCard: { padding: 15 }, courseTitle: { color: palette.ink, fontWeight: '700', fontSize: 16 }, courseDescription: { color: palette.muted, fontSize: 13, marginTop: 4, lineHeight: 19 }, status: { color: palette.green, fontWeight: '700', fontSize: 12, marginTop: 12 }, pending: { color: '#91610a' }, actions: { flexDirection: 'row', gap: 18, marginTop: 9 }, link: { color: palette.green, fontWeight: '700', fontSize: 13 }, center: { padding: 25, alignItems: 'center' },
});
