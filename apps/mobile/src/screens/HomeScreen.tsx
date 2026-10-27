import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen, Card, Feedback, palette, ScreenTitle } from '../components/ui';
import { api } from '../lib/api';
import type { Session } from '../lib/session';
import type { Course, Test } from '../types';

type HomeNavigation = { navigate: (name: 'Courses' | 'Tests' | 'Manage') => void };
type Props = { navigation: HomeNavigation; session?: Session | null };

export default function HomeScreen({ navigation, session }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadContent = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError('');
    const results = await Promise.allSettled([api<Course[]>('/courses'), api<Test[]>('/tests')]);
    if (results[0].status === 'fulfilled') setCourses(results[0].value);
    if (results[1].status === 'fulfilled') setTests(results[1].value);
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failures.length) setError(failures.map(({ reason }) => reason instanceof Error ? reason.message : 'Ma’lumotlarni yuklab bo‘lmadi.').join(' · '));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void loadContent(); }, [loadContent]);

  const firstName = session?.user.name?.trim().split(/\s+/)[0] || 'do‘st';
  const isTeacher = session?.user.role === 'teacher';
  const isAdmin = session?.user.role === 'admin';

  return <AppScreen style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadContent(true)} tintColor={palette.green} />}>
      <Text style={styles.eyebrow}>{session ? `SHAXSIY KABINET · ${isAdmin ? 'ADMIN' : isTeacher ? 'O‘QITUVCHI' : 'O‘QUVCHI'}` : 'O‘RGANISHNING YANGI USULI'}</Text>
      <ScreenTitle title={`Salom, ${firstName}.`} subtitle={isAdmin ? 'Platforma boshqaruviga xush kelibsiz.' : isTeacher ? 'Bilimingizni ulashing va yangi kurslar yarating.' : 'Har bir dars sizni maqsadingizga yaqinlashtiradi.'} />
      <Card style={styles.heroCard}>
        <Text style={styles.heroTag}>BUGUNGI KICHIK QADAM</Text>
        <Text style={styles.heroTitle}>{'Yangi til.\nYangi imkoniyat.'}</Text>
        <Text style={styles.heroCopy}>O‘zingizga mos kursni tanlang va qulay vaqtda o‘rganing.</Text>
        <Pressable onPress={() => navigation.navigate('Courses')} style={styles.heroButton}><Text style={styles.heroButtonText}>Kurslarni ko‘rish  →</Text></Pressable>
      </Card>
      <Feedback message={error} />

      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Siz uchun tanlandi</Text><Text style={styles.sectionCopy}>O‘rganishni boshlash uchun kurs tanlang.</Text></View><Pressable onPress={() => navigation.navigate('Courses')}><Text style={styles.seeAll}>Barchasi →</Text></Pressable></View>
      {loading && !courses.length ? <View style={styles.inlineLoading}><ActivityIndicator color={palette.green} /><Text style={styles.sectionCopy}>Kurslar yuklanmoqda...</Text></View>
        : <FlatList horizontal data={courses.slice(0, 5)} keyExtractor={(course) => course._id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} ListEmptyComponent={<Text style={styles.sectionCopy}>Hozircha kurslar qo‘shilmagan.</Text>} renderItem={({ item }) => <Pressable onPress={() => navigation.navigate('Courses')}><Card style={styles.courseCard}><Text style={styles.courseEmoji}>{item.coverUrl?.match(/🇬🇧|🇰🇷|🇩🇪|🇫🇷|🇪🇸/)?.[0] || '🌍'}</Text><Text numberOfLines={2} style={styles.courseTitle}>{item.title}</Text><Text style={styles.sectionCopy}>{item.isPaid ? `${(item.price || 0).toLocaleString('uz-UZ')} so‘m` : 'Bepul'}</Text></Card></Pressable>} />}

      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Bilimingizni sinab ko‘ring</Text><Text style={styles.sectionCopy}>Darajangizni test orqali tekshiring.</Text></View><Pressable onPress={() => navigation.navigate('Tests')}><Text style={styles.seeAll}>Testlar →</Text></Pressable></View>
      {loading && !tests.length ? <View style={styles.inlineLoading}><ActivityIndicator color={palette.green} /><Text style={styles.sectionCopy}>Testlar yuklanmoqda...</Text></View>
        : <FlatList horizontal data={tests.slice(0, 4)} keyExtractor={(test) => test._id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList} ListEmptyComponent={<Text style={styles.sectionCopy}>Hozircha testlar mavjud emas.</Text>} renderItem={({ item }) => <Pressable onPress={() => navigation.navigate('Tests')}><Card style={styles.testCard}><Text style={styles.testLevel}>{item.level}</Text><Text numberOfLines={2} style={styles.courseTitle}>{item.title}</Text><Text style={styles.sectionCopy}>{item.questionCount || 0} ta savol · Natija darhol</Text></Card></Pressable>} />}

      {(isTeacher || isAdmin) && <Card style={styles.manageCard}><View style={styles.manageCopy}><Text style={styles.sectionTitle}>{isAdmin ? 'Admin boshqaruvi' : 'O‘qituvchi kabineti'}</Text><Text style={styles.sectionCopy}>{isAdmin ? 'Kurslar, foydalanuvchilar va so‘rovlarni boshqaring.' : 'Kurslaringiz va testlaringizni boshqaring.'}</Text></View><Pressable onPress={() => navigation.navigate('Manage')}><Text style={styles.seeAll}>Ochish →</Text></Pressable></Card>}
    </ScrollView>
  </AppScreen>;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16 }, content: { paddingBottom: 25 }, eyebrow: { color: '#52735c', fontWeight: '800', fontSize: 10, letterSpacing: 1, marginTop: 9 },
  heroCard: { backgroundColor: '#1e4b35', borderColor: '#1e4b35', padding: 20, marginBottom: 24 }, heroTag: { color: '#d6ead9', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, heroTitle: { color: '#fff', fontSize: 29, lineHeight: 35, fontWeight: '700', marginTop: 10 }, heroCopy: { color: '#e3eee5', fontSize: 14, lineHeight: 20, marginTop: 9 }, heroButton: { alignSelf: 'flex-start', backgroundColor: '#d8edda', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, marginTop: 16 }, heroButtonText: { color: '#1b5235', fontWeight: '800', fontSize: 13 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, marginBottom: 6, gap: 8 }, sectionTitle: { color: palette.ink, fontWeight: '700', fontSize: 17 }, sectionCopy: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, seeAll: { color: palette.green, fontWeight: '700', fontSize: 12 }, horizontalList: { paddingRight: 6, paddingTop: 5, paddingBottom: 10, gap: 10 }, courseCard: { width: 205, minHeight: 139, marginBottom: 0 }, courseEmoji: { fontSize: 24 }, courseTitle: { color: palette.ink, fontWeight: '700', fontSize: 14, lineHeight: 19, marginTop: 8 }, testCard: { width: 220, minHeight: 132, marginBottom: 0 }, testLevel: { color: palette.green, fontSize: 23, fontWeight: '800' },
  inlineLoading: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: 10 }, manageCard: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, manageCopy: { flex: 1 },
});
