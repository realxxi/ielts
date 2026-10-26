import { ComponentType, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { AppButton, AppScreen, Card, EmptyState, Feedback, palette, ScreenTitle } from '../components/ui';
import { api } from '../lib/api';
import type { Course, CourseProgress, CourseRoutes } from '../types';
const NativeWebView = WebView as unknown as ComponentType<any>;

type Props = NativeStackScreenProps<CourseRoutes, 'Detail'> & { role: 'student' | 'teacher' | 'admin' };

export default function CourseDetailScreen({ route, role }: Props) {
  const { id } = route.params;
  const [course, setCourse] = useState<Course | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [activePresentation, setActivePresentation] = useState<{ title: string; html: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCourse = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api<Course>(`/courses/${id}`);
      setCourse(result);
      if (!result.locked) {
        try {
          const progress = await api<CourseProgress>(`/courses/${id}/progress`);
          setCompleted(progress.completedLessons || []);
        } catch {
          setCompleted([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kursni yuklab bo‘lmadi.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void loadCourse(); }, [loadCourse]));

  const lessons = useMemo(() => course?.sections?.flatMap((section) => section.lessons || []) || [], [course]);
  const percentage = lessons.length ? Math.round(completed.length * 100 / lessons.length) : 0;

  async function requestAccess() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/courses/${id}/request-access`, { method: 'POST' });
      setNotice('Kirish so‘rovi adminga yuborildi. Tasdiqlangach kurs ochiladi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirish so‘rovini yuborib bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleLesson(lessonId: string) {
    const next = completed.includes(lessonId) ? completed.filter((idValue) => idValue !== lessonId) : [...completed, lessonId];
    const previous = completed;
    setCompleted(next);
    setError('');
    try {
      await api(`/courses/${id}/progress`, { method: 'POST', body: JSON.stringify({ completedLessons: next }) });
    } catch (err) {
      setCompleted(previous);
      setError(err instanceof Error ? err.message : 'O‘qish jarayonini saqlab bo‘lmadi.');
    }
  }

  async function openSlide(slide: NonNullable<Course['slides']>[number]) {
    setBusy(true);
    setError('');
    try {
      const [mime, encoded] = slide.dataUrl.split(',', 2);
      if (!mime?.startsWith('data:application/pdf;base64') || !encoded) throw new Error('PDF fayl formati noto‘g‘ri.');
      const fileName = slide.name.toLowerCase().endsWith('.pdf') ? slide.name : `${slide.name}.pdf`;
      const uri = `${FileSystem.cacheDirectory}${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await FileSystem.writeAsStringAsync(uri, encoded, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: slide.name });
      else throw new Error('Bu qurilmada PDF faylni ochish imkoniyati topilmadi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF faylni ochib bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !course) return <AppScreen><View style={styles.center}><ActivityIndicator size="large" color={palette.green} /><Text style={styles.muted}>Kurs yuklanmoqda...</Text></View></AppScreen>;
  if (!course) return <AppScreen><ScreenTitle title="Kurs ochilmadi" /><Feedback message={error} /><EmptyState title="Kurs ma’lumotlarini yuklab bo‘lmadi" detail="Internetni tekshirib, qayta urinib ko‘ring." /><AppButton title="Qayta urinish" onPress={loadCourse} /></AppScreen>;

  return <AppScreen style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{course.isPaid ? 'OBUNALI KURS' : 'BEPUL KURS'}</Text>
      <ScreenTitle title={course.title} subtitle={course.description} />
      <Card><View style={styles.summaryRow}><Text style={styles.price}>{course.isPaid ? `${(course.price || 0).toLocaleString('uz-UZ')} so‘m` : 'Bepul'}</Text><Text style={styles.muted}>{lessons.length} ta dars</Text></View></Card>
      <Feedback message={error} />
      <Feedback message={notice} variant="success" />

      {course.locked ? <Card style={styles.lockedCard}>
        <Text style={styles.sectionTitle}>Kursga kirish yopiq</Text>
        <Text style={styles.muted}>Kirish so‘rovi yuboring. Admin tasdiqlagach darslar ochiladi.</Text>
        {role === 'student' ? <AppButton title="Kirish so‘rovini yuborish" onPress={requestAccess} loading={busy} /> : null}
      </Card> : <>
        {!!course.presentations?.length && <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kurs prezentatsiyalari</Text>
          {course.presentations.map((presentation, index) => <Pressable key={presentation._id || `${presentation.title}-${index}`} onPress={() => setActivePresentation(presentation)} style={styles.resourceRow}>
            <Text style={styles.resourceIcon}>▤</Text><View style={styles.resourceText}><Text style={styles.lessonTitle}>{presentation.title}</Text><Text style={styles.linkText}>Prezentatsiyani ochish ↗</Text></View>
          </Pressable>)}
        </View>}

        {!!course.slides?.length && <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qo‘shimcha slaydlar</Text>
          {course.slides.map((slide, index) => <Pressable key={`${slide.name}-${index}`} onPress={() => openSlide(slide)} style={styles.resourceRow}>
            <Text style={styles.resourceIcon}>PDF</Text><View style={styles.resourceText}><Text style={styles.lessonTitle}>{slide.name}</Text><Text style={styles.linkText}>{busy ? 'Ochilyapti...' : 'PDFni ochish ↗'}</Text></View>
          </Pressable>)}
        </View>}

        <Card style={styles.progressCard}>
          <View style={styles.summaryRow}><View><Text style={styles.sectionTitle}>O‘qish jarayoni</Text><Text style={styles.muted}>{completed.length} / {lessons.length} dars yakunlandi</Text></View><Text style={styles.percentage}>{percentage}%</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percentage}%` }]} /></View>
        </Card>

        {course.sections?.map((section) => <View key={section._id} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.lessons.map((lesson) => {
            const done = completed.includes(lesson._id);
            const expanded = openLesson === lesson._id;
            return <Card key={lesson._id} style={styles.lessonCard}>
              <View style={styles.lessonRow}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} onPress={() => toggleLesson(lesson._id)} style={[styles.check, done && styles.checked]}><Text style={styles.checkmark}>{done ? '✓' : ''}</Text></Pressable>
                <Pressable style={styles.lessonMain} onPress={() => setOpenLesson(expanded ? null : lesson._id)}><Text style={styles.lessonTitle}>{lesson.title}</Text><Text style={styles.linkText}>{expanded ? 'Darsni yopish' : 'Darsni ochish'}</Text></Pressable>
                {lesson.videoUrl ? <Pressable onPress={() => Linking.openURL(lesson.videoUrl!).catch(() => setError('Videoni ochib bo‘lmadi.'))}><Text style={styles.videoLink}>Video ↗</Text></Pressable> : null}
              </View>
              {expanded ? <Text style={styles.lessonContent}>{lesson.content || 'Bu dars uchun matn kiritilmagan.'}</Text> : null}
            </Card>;
          })}
        </View>)}
      </>}
    </ScrollView>
    <Modal visible={!!activePresentation} animationType="slide" onRequestClose={() => setActivePresentation(null)}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}><Text numberOfLines={1} style={styles.modalTitle}>{activePresentation?.title}</Text><Pressable onPress={() => setActivePresentation(null)}><Text style={styles.close}>Yopish ×</Text></Pressable></View>
        {activePresentation ? <NativeWebView originWhitelist={['*']} source={{ html: activePresentation.html }} javaScriptEnabled style={styles.webview} /> : null}
      </View>
    </Modal>
  </AppScreen>;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16 }, content: { paddingBottom: 28 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, muted: { color: palette.muted, fontSize: 14, lineHeight: 20 },
  eyebrow: { color: '#52735c', fontWeight: '800', fontSize: 11, letterSpacing: 1.1, marginTop: 8 }, summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, price: { color: palette.green, fontSize: 17, fontWeight: '700' },
  lockedCard: { gap: 12, backgroundColor: '#fffaf0', borderColor: '#efdfb8' }, section: { marginTop: 17 }, sectionTitle: { color: palette.ink, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  resourceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: palette.border, padding: 13, marginBottom: 9, gap: 12 }, resourceIcon: { color: palette.green, fontSize: 15, fontWeight: '800', width: 34, textAlign: 'center' }, resourceText: { flex: 1 }, lessonTitle: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: '700' }, linkText: { color: palette.green, fontSize: 12, fontWeight: '600', marginTop: 4 },
  progressCard: { marginTop: 18 }, percentage: { color: palette.green, fontSize: 20, fontWeight: '800' }, progressTrack: { height: 7, backgroundColor: '#e7eee8', borderRadius: 6, overflow: 'hidden', marginTop: 13 }, progressFill: { height: '100%', backgroundColor: palette.green, borderRadius: 6 },
  lessonCard: { padding: 13, marginBottom: 8 }, lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, check: { width: 24, height: 24, borderWidth: 1.5, borderColor: '#96aa9b', borderRadius: 7, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: palette.green, borderColor: palette.green }, checkmark: { color: '#fff', fontWeight: '800' }, lessonMain: { flex: 1 }, videoLink: { color: palette.green, fontWeight: '700', fontSize: 12, padding: 6 }, lessonContent: { color: '#536057', lineHeight: 21, paddingTop: 13, paddingLeft: 35 },
  modal: { flex: 1, backgroundColor: '#fff' }, modalHeader: { minHeight: 54, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: palette.border }, modalTitle: { flex: 1, color: palette.ink, fontSize: 16, fontWeight: '700' }, close: { color: palette.green, fontWeight: '700', padding: 8 }, webview: { flex: 1 },
});
