import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppScreen, Card, EmptyState, Feedback, palette, ScreenTitle } from '../components/ui';
import { api } from '../lib/api';
import type { Test, TestRoutes } from '../types';

type Props = NativeStackScreenProps<TestRoutes, 'Catalog'>;

export default function TestCatalogScreen({ navigation }: Props) {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTests = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setTests(await api<Test[]>('/tests'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Testlarni yuklab bo‘lmadi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadTests(); }, [loadTests]);

  return <AppScreen style={styles.screen}>
    <FlatList
      data={tests}
      keyExtractor={(test) => test._id}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTests(true)} tintColor={palette.green} />}
      ListHeaderComponent={<><ScreenTitle title="Til testlari" subtitle="Darajangizni tekshiring va natijangizni darhol ko‘ring." /><Feedback message={error} /></>}
      ListEmptyComponent={loading
        ? <View style={styles.loading}><ActivityIndicator color={palette.green} size="large" /><Text style={styles.muted}>Testlar yuklanmoqda...</Text></View>
        : error ? <EmptyState title="Testlarni yuklab bo‘lmadi" detail="Pastga tortib qayta urinib ko‘ring." />
          : <EmptyState title="Hozircha testlar yo‘q" detail="Admin testlar qo‘shgach shu yerda ko‘rinadi." />}
      renderItem={({ item, index }) => <TestCard test={item} index={index} onPress={() => navigation.navigate('Take', { id: item._id })} />}
    />
  </AppScreen>;
}

function TestCard({ test, index, onPress }: { test: Test; index: number; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress}>
    <Card style={styles.card}>
      <View style={styles.top}><Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text><Text style={styles.level}>{test.level}</Text></View>
      <Text style={styles.questionCount}>{test.questionCount || 0} TA SAVOL</Text>
      <Text style={styles.title}>{test.title}</Text>
      <View style={styles.footer}><Text style={styles.muted}>Natija darhol chiqadi</Text><Text style={styles.start}>Testni boshlash ↗</Text></View>
    </Card>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16 }, content: { flexGrow: 1, paddingBottom: 24 }, card: { padding: 17, marginBottom: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, number: { color: '#819087', fontSize: 12, fontWeight: '700' }, level: { color: palette.green, fontSize: 23, fontWeight: '800' },
  questionCount: { color: '#718078', fontSize: 10, fontWeight: '800', letterSpacing: 0.9, marginTop: 12 }, title: { color: palette.ink, fontSize: 18, lineHeight: 24, fontWeight: '700', marginTop: 5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#edf1ed', marginTop: 15, paddingTop: 12, gap: 8 }, muted: { color: palette.muted, fontSize: 12 }, start: { color: palette.green, fontSize: 12, fontWeight: '700' },
  loading: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10 },
});
