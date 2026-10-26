import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppScreen, Card, EmptyState, Feedback, palette, ScreenTitle } from '../components/ui';
import { api } from '../lib/api';
import type { Course, CourseRoutes } from '../types';

type Props = NativeStackScreenProps<CourseRoutes, 'Catalog'>;

export default function CourseCatalogScreen({ navigation }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadCourses = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setCourses(await api<Course[]>('/courses'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kurslarni yuklab bo‘lmadi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadCourses(); }, [loadCourses]);

  return <AppScreen style={styles.screen}>
    <FlatList
      data={courses}
      keyExtractor={(course) => course._id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCourses(true)} tintColor={palette.green} />}
      ListHeaderComponent={<>
        <ScreenTitle title="Kurslar katalogi" subtitle="Maqsadingizga mos kursni tanlang va o‘rganishni boshlang." />
        <Feedback message={error} />
      </>}
      ListEmptyComponent={loading
        ? <View style={styles.loading}><ActivityIndicator size="large" color={palette.green} /><Text style={styles.muted}>Kurslar yuklanmoqda...</Text></View>
        : error ? <EmptyState title="Kurslarni yuklab bo‘lmadi" detail="Internetni tekshirib, pastga tortib qayta urinib ko‘ring." />
          : <EmptyState title="Hozircha kurslar yo‘q" detail="Yangi kurslar qo‘shilgach shu yerda ko‘rinadi." />}
      renderItem={({ item }) => <CourseRow course={item} onPress={() => navigation.navigate('Detail', { id: item._id })} />}
    />
  </AppScreen>;
}

function CourseRow({ course, onPress }: { course: Course; onPress: () => void }) {
  const teacher = typeof course.teacherId === 'object' ? course.teacherId?.name : undefined;
  const lessonCount = course.sections?.reduce((total, section) => total + (section.lessons?.length || 0), 0) || 0;
  const coverEmoji = course.coverUrl?.match(/🇬🇧|🇰🇷|🇩🇪|🇫🇷|🇪🇸/)?.[0] || '🌍';
  return <Pressable accessibilityRole="button" onPress={onPress}>
    <Card style={styles.card}>
      <View style={styles.cardTop}><Text style={styles.emoji}>{coverEmoji}</Text><Text style={[styles.badge, course.isPaid && styles.paidBadge]}>{course.isPaid ? 'OBUNALI' : 'BEPUL'}</Text></View>
      <Text style={styles.courseTitle}>{course.title}</Text>
      <Text numberOfLines={2} style={styles.description}>{course.description || 'Kurs tavsifi hozircha berilmagan.'}</Text>
      <Text style={styles.meta}>{teacher || 'Tilshunos o‘qituvchisi'} · {lessonCount} ta dars</Text>
      <View style={styles.footer}><Text style={styles.price}>{course.isPaid ? `${(course.price || 0).toLocaleString('uz-UZ')} so‘m` : 'Bepul'}</Text><Text style={styles.open}>Kursni ochish ↗</Text></View>
    </Card>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16 }, listContent: { paddingBottom: 24, flexGrow: 1 },
  card: { padding: 16, marginBottom: 13 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  emoji: { fontSize: 30 }, badge: { color: '#356447', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, backgroundColor: '#e8f2e9', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 }, paidBadge: { color: '#795417', backgroundColor: '#fbf0d9' },
  courseTitle: { color: palette.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' }, description: { color: '#526157', fontSize: 14, lineHeight: 20, marginTop: 6 }, meta: { color: palette.muted, fontSize: 12, marginTop: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#edf1ed', marginTop: 13, paddingTop: 12 }, price: { color: palette.green, fontWeight: '700', fontSize: 15 }, open: { color: palette.green, fontWeight: '700', fontSize: 13 },
  loading: { flex: 1, minHeight: 180, justifyContent: 'center', alignItems: 'center', gap: 10 }, muted: { color: palette.muted, fontSize: 14 },
});
