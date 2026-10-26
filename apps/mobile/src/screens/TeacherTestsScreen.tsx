import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { AppButton, AppInput, Card, EmptyState, Feedback, palette, ScreenTitle } from '../components/ui';
import { api } from '../lib/api';
import type { Test, TestDraftQuestion, TestOption } from '../types';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const choices: TestOption[] = ['A', 'B', 'C', 'D'];
const newQuestion = (): TestDraftQuestion => ({ number: 1, question: '', options: { A: '', B: '', C: '', D: '' }, answer: 'A' });

export default function TeacherTestsScreen() {
  const [tests, setTests] = useState<Test[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('A1');
  const [questions, setQuestions] = useState<TestDraftQuestion[]>([newQuestion()]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadTests = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    try { setTests(await api<Test[]>('/tests/mine')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Testlaringizni yuklab bo‘lmadi.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void loadTests(); }, [loadTests]);

  function resetForm() { setEditingId(null); setTitle(''); setLevel('A1'); setQuestions([newQuestion()]); setError(''); }
  function updateQuestion(index: number, updater: (question: TestDraftQuestion) => TestDraftQuestion) { setQuestions((current) => current.map((question, i) => i === index ? updater(question) : question)); }

  async function editTest(id: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const detail = await api<Omit<Test, 'questions'> & { questions: TestDraftQuestion[] }>(`/tests/${id}/manage`);
      setEditingId(id); setTitle(detail.title); setLevel(detail.level);
      setQuestions(detail.questions.map((question) => ({ ...question, options: { ...question.options } })));
    } catch (err) { setError(err instanceof Error ? err.message : 'Testni ochib bo‘lmadi.'); }
    finally { setBusy(false); }
  }

  async function saveTest() {
    setBusy(true); setError(''); setNotice('');
    const payload = { title: title.trim(), level, questions: questions.map((question, index) => ({ ...question, number: index + 1 })) };
    try {
      await api(editingId ? `/tests/${editingId}` : '/tests', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      setNotice(editingId ? 'Test yangilandi.' : 'Test yaratildi va katalogga qo‘shildi.');
      resetForm();
      await loadTests();
    } catch (err) { setError(err instanceof Error ? err.message : 'Testni saqlab bo‘lmadi.'); }
    finally { setBusy(false); }
  }

  function deleteTest(test: Test) {
    Alert.alert('Testni o‘chirish', `“${test.title}” testini butunlay o‘chirasizmi?`, [
      { text: 'Bekor qilish', style: 'cancel' },
      { text: 'O‘chirish', style: 'destructive', onPress: async () => {
        setError('');
        try { await api(`/tests/${test._id}`, { method: 'DELETE' }); if (editingId === test._id) resetForm(); setNotice('Test o‘chirildi.'); await loadTests(); }
        catch (err) { setError(err instanceof Error ? err.message : 'Testni o‘chirib bo‘lmadi.'); }
      } },
    ]);
  }

  const header = <>
    <ScreenTitle title="Testlarim" subtitle="Savol va javob variantlarini kiriting. Yaratilgan test katalogda ko‘rinadi." />
    <Feedback message={error} /><Feedback message={notice} variant="success" />
    <Card style={styles.formCard}>
      <Text style={styles.formTitle}>{editingId ? 'Testni tahrirlash' : 'Yangi test tuzing'}</Text>
      <AppInput label="Test nomi" value={title} onChangeText={setTitle} placeholder="Masalan: Ingliz tili A1 — 1-test" />
      <Text style={styles.label}>Til darajasi</Text>
      <View style={styles.chipRow}>{levels.map((item) => <Pressable key={item} onPress={() => setLevel(item)} style={[styles.chip, item === level && styles.chipActive]}><Text style={[styles.chipText, item === level && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
      {questions.map((question, index) => <View key={index} style={styles.questionDraft}>
        <View style={styles.questionHeading}><Text style={styles.questionLabel}>Savol {index + 1}</Text>{questions.length > 1 ? <Pressable onPress={() => setQuestions((current) => current.filter((_, i) => i !== index))}><Text style={styles.remove}>Olib tashlash</Text></Pressable> : null}</View>
        <AppInput label="Savol matni" value={question.question} onChangeText={(value) => updateQuestion(index, (current) => ({ ...current, question: value }))} multiline placeholder="Savol matnini yozing" style={styles.multiline} />
        {choices.map((choice) => <AppInput key={choice} label={`${choice} javob`} value={question.options[choice]} onChangeText={(value) => updateQuestion(index, (current) => ({ ...current, options: { ...current.options, [choice]: value } }))} placeholder={`${choice} variant`} />)}
        <Text style={styles.label}>To‘g‘ri javob</Text>
        <View style={styles.chipRow}>{choices.map((choice) => <Pressable key={choice} onPress={() => updateQuestion(index, (current) => ({ ...current, answer: choice }))} style={[styles.answerChoice, question.answer === choice && styles.chipActive]}><Text style={[styles.chipText, question.answer === choice && styles.chipTextActive]}>{choice}</Text></Pressable>)}</View>
      </View>)}
      <AppButton title="+ Savol qo‘shish" variant="secondary" onPress={() => setQuestions((current) => [...current, newQuestion()])} />
      <View style={styles.saveButton}><AppButton title={editingId ? 'O‘zgarishlarni saqlash' : 'Testni yaratish'} loading={busy} disabled={title.trim().length < 2 || questions.some((question) => !question.question.trim() || choices.some((choice) => !question.options[choice].trim()) || question.answer === undefined)} onPress={saveTest} /></View>
      {editingId ? <View style={styles.cancel}><AppButton title="Tahrirlashni bekor qilish" variant="secondary" onPress={resetForm} /></View> : null}
    </Card>
    <Text style={styles.listTitle}>Yaratgan testlarim</Text>
  </>;

  return <FlatList
    data={tests}
    keyExtractor={(test) => test._id}
    contentContainerStyle={styles.list}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTests(true)} tintColor={palette.green} />}
    ListHeaderComponent={header}
    ListEmptyComponent={loading ? <View style={styles.loading}><ActivityIndicator color={palette.green} /></View> : <EmptyState title="Hali test yaratmagansiz" detail="Yuqoridagi formadan birinchi testni qo‘shing." />}
    renderItem={({ item }) => <Card style={styles.testCard}><Text style={styles.testTitle}>{item.title}</Text><Text style={styles.meta}>{item.level} · {item.questionCount || 0} ta savol · Ommaviy</Text><View style={styles.actions}><Pressable onPress={() => editTest(item._id)}><Text style={styles.link}>Tahrirlash</Text></Pressable><Pressable onPress={() => deleteTest(item)}><Text style={styles.remove}>O‘chirish</Text></Pressable></View></Card>}
  />;
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 28 }, formCard: { marginTop: 2 }, formTitle: { color: palette.ink, fontSize: 18, fontWeight: '700', marginBottom: 15 }, label: { color: '#293a30', fontSize: 14, fontWeight: '600', marginBottom: 8 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }, chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: '#fff' }, chipActive: { backgroundColor: palette.green, borderColor: palette.green }, chipText: { color: palette.ink, fontWeight: '700' }, chipTextActive: { color: '#fff' },
  questionDraft: { borderTopWidth: 1, borderColor: '#e5ece6', paddingTop: 14, marginBottom: 10 }, questionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }, questionLabel: { color: palette.ink, fontWeight: '700', fontSize: 16 }, remove: { color: '#a43d35', fontWeight: '700', fontSize: 13, padding: 6 }, multiline: { minHeight: 76, textAlignVertical: 'top', paddingTop: 11 }, answerChoice: { width: 44, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: '#fff' }, saveButton: { marginTop: 12 }, cancel: { marginTop: 9 }, listTitle: { color: palette.ink, fontWeight: '700', fontSize: 19, marginVertical: 12 }, testCard: { padding: 15 }, testTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' }, meta: { color: palette.muted, fontSize: 12, marginTop: 5 }, actions: { flexDirection: 'row', gap: 18, marginTop: 11 }, link: { color: palette.green, fontSize: 13, fontWeight: '700' }, loading: { padding: 20, alignItems: 'center' },
});
