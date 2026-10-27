import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton, AppScreen, Card, EmptyState, Feedback, palette, ScreenTitle } from '../components/ui';
import { api } from '../lib/api';
import type { Test, TestQuestionResult, TestResult, TestRoutes, TestOption } from '../types';

type Props = NativeStackScreenProps<TestRoutes, 'Take'>;
const optionLetters: TestOption[] = ['A', 'B', 'C', 'D'];

export default function TestTakeScreen({ route }: Props) {
  const { id } = route.params;
  const [test, setTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<string, TestOption>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showQuestionList, setShowQuestionList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<Test>(`/tests/${id}`).then((loaded) => { if (active) setTest(loaded); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Testni yuklab bo‘lmadi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const questions = useMemo(() => test?.questions || [], [test?.questions]);
  const question = questions[activeIndex];
  const answered = useMemo(() => questions.filter((item) => answers[String(item.number)]).length, [questions, answers]);
  const currentResult = result?.results.find((item) => item.number === question?.number);

  async function submit() {
    if (!test) return;
    setBusy(true);
    setError('');
    try {
      const submitted = await api<TestResult>(`/tests/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
      setResult(submitted);
      setActiveIndex(0);
      setShowQuestionList(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Javoblarni yuborib bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setResult(null);
    setAnswers({});
    setActiveIndex(0);
    setError('');
  }

  if (loading) return <AppScreen><View style={styles.center}><ActivityIndicator size="large" color={palette.green} /><Text style={styles.muted}>Test yuklanmoqda...</Text></View></AppScreen>;
  if (!test || !question) return <AppScreen><ScreenTitle title="Test ochilmadi" /><Feedback message={error} /><EmptyState title="Test savollarini yuklab bo‘lmadi" detail="Testlar bo‘limiga qaytib, qayta urinib ko‘ring." /></AppScreen>;

  return <AppScreen style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{test.level} DARAJA · {questions.length} TA SAVOL</Text>
      <ScreenTitle title={result ? 'Test natijasi' : test.title} subtitle={result ? `${test.title} · ${result.percentage}% to‘g‘ri javob` : 'Javoblaringiz belgilanadi. Testni login qilmasdan ham yechish mumkin.'} />
      {result ? <Card style={styles.resultCard}>
        <Text style={styles.score}>{result.score} / {result.total}</Text>
        <Text style={styles.resultLabel}>{result.percentage >= 80 ? 'Ajoyib natija!' : result.percentage >= 50 ? 'Yaxshi urinish!' : 'Yana bir bor urinib ko‘ring!'}</Text>
      </Card> : <>
        <View style={styles.progressInfo}><Text style={styles.muted}>Javoblangan: {answered} / {questions.length}</Text><Pressable onPress={() => setShowQuestionList((shown) => !shown)}><Text style={styles.jump}>{showQuestionList ? 'Savollarni yopish' : 'Savollarga o‘tish'}</Text></Pressable></View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${answered * 100 / questions.length}%` }]} /></View>
      </>}

      {showQuestionList ? <Card style={styles.questionGrid}>
        <Text style={styles.gridTitle}>Savolni tanlang</Text>
        <View style={styles.gridRows}>{questions.map((item, index) => <Pressable key={item.number} onPress={() => { setActiveIndex(index); setShowQuestionList(false); }} style={[styles.questionNumber, answers[String(item.number)] && styles.answered, activeIndex === index && styles.current]}><Text style={[styles.numberText, (answers[String(item.number)] || activeIndex === index) && styles.selectedNumber]}>{item.number}</Text></Pressable>)}</View>
      </Card> : <Card style={styles.questionCard}>
        <View style={styles.questionMeta}><Text style={styles.eyebrow}>SAVOL {question.number}</Text><Text style={styles.muted}>{activeIndex + 1} / {questions.length}</Text></View>
        <Text style={styles.questionText}>{question.question}</Text>
        {currentResult ? <Feedback message={currentResult.correct ? 'To‘g‘ri javob!' : `To‘g‘ri javob: ${currentResult.correctAnswer}`} variant={currentResult.correct ? 'success' : 'warning'} /> : null}
        {optionLetters.map((letter) => {
          const selected = answers[String(question.number)] === letter;
          const review = currentResult?.correctAnswer === letter;
          const wrong = selected && currentResult && !currentResult.correct;
          return <Pressable key={letter} disabled={!!result} onPress={() => { setAnswers((current) => ({ ...current, [String(question.number)]: letter })); setError(''); }} style={[styles.option, selected && styles.optionSelected, review && styles.optionCorrect, wrong && styles.optionWrong]}>
            <Text style={[styles.optionLetter, (selected || review) && styles.optionLetterSelected]}>{letter}</Text><Text style={styles.optionText}>{question.options[letter]}</Text>
            {result && review ? <Text style={styles.answerMark}>To‘g‘ri</Text> : null}
            {wrong ? <Text style={styles.answerMark}>Siz tanlagan</Text> : null}
          </Pressable>;
        })}
      </Card>}

      {result && <View style={styles.reviewList}><Text style={styles.gridTitle}>Barcha savollar natijasi</Text>{questions.map((item) => {
        const review: TestQuestionResult | undefined = result.results.find((entry) => entry.number === item.number);
        const selectedText = review?.selected ? `${review.selected} — ${item.options[review.selected]}` : 'Javob berilmagan';
        const correctText = review ? `${review.correctAnswer} — ${item.options[review.correctAnswer]}` : '—';
        return <Card key={item.number} style={styles.reviewCard}><View style={styles.questionMeta}><Text style={styles.eyebrow}>SAVOL {item.number}</Text><Text style={[styles.reviewStatus, review?.correct ? styles.correctText : styles.wrongText]}>{review?.correct ? 'To‘g‘ri ✓' : 'Noto‘g‘ri'}</Text></View><Text style={styles.reviewQuestion}>{item.question}</Text><Text style={styles.answerLine}>To‘g‘ri javob: {correctText}</Text><Text style={styles.muted}>Sizning javobingiz: {selectedText}</Text></Card>;
      })}</View>}
      <Feedback message={error} />
      <View style={styles.navigation}>
        {!result && <AppButton title="← Oldingi" variant="secondary" disabled={activeIndex === 0 || busy} onPress={() => { setActiveIndex((index) => index - 1); setError(''); }} />}
        {!result && activeIndex < questions.length - 1
          ? <AppButton title="Keyingi →" onPress={() => { setActiveIndex((index) => index + 1); setError(''); }} />
          : result ? <AppButton title="Testni qayta ishlash ↻" onPress={restart} />
            : <AppButton title="Testni yakunlash" loading={busy} onPress={submit} />}
      </View>
    </ScrollView>
  </AppScreen>;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16 }, content: { paddingBottom: 26 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, muted: { color: palette.muted, fontSize: 13, lineHeight: 20 }, eyebrow: { color: '#52735c', fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  progressInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, jump: { color: palette.green, fontWeight: '700', fontSize: 13 }, progressTrack: { height: 7, backgroundColor: '#e4ece5', borderRadius: 8, overflow: 'hidden', marginBottom: 15 }, progressFill: { height: '100%', backgroundColor: palette.green },
  questionCard: { padding: 17 }, questionMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, questionText: { color: palette.ink, fontWeight: '700', fontSize: 19, lineHeight: 27, marginTop: 13, marginBottom: 17 },
  option: { minHeight: 50, borderWidth: 1, borderColor: '#dce6de', backgroundColor: '#fff', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 9, gap: 10 }, optionSelected: { borderColor: '#47815b', backgroundColor: '#f0f7f1' }, optionCorrect: { borderColor: '#25834f', backgroundColor: '#eaf7ed' }, optionWrong: { borderColor: '#d56b5d', backgroundColor: '#fff0ed' }, optionLetter: { width: 28, height: 28, textAlign: 'center', textAlignVertical: 'center', borderRadius: 8, color: '#5b6a60', backgroundColor: '#f0f3f0', overflow: 'hidden', fontWeight: '800' }, optionLetterSelected: { color: '#fff', backgroundColor: palette.green }, optionText: { color: '#344339', fontSize: 14, lineHeight: 20, flex: 1 }, answerMark: { color: palette.green, fontSize: 10, fontWeight: '700' },
  navigation: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 13 }, resultCard: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#edf6ef' }, score: { color: palette.green, fontSize: 34, fontWeight: '800' }, resultLabel: { color: palette.ink, fontSize: 17, fontWeight: '700', marginTop: 5 },
  questionGrid: { padding: 15 }, gridTitle: { color: palette.ink, fontSize: 17, fontWeight: '700', marginBottom: 12 }, gridRows: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, questionNumber: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#d8e1da', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, answered: { backgroundColor: '#e7f2e8', borderColor: '#94b69a' }, current: { borderWidth: 2, borderColor: palette.green }, numberText: { color: '#55645a', fontWeight: '700' }, selectedNumber: { color: palette.green },
  reviewList: { marginTop: 18 }, reviewCard: { padding: 14 }, reviewQuestion: { color: palette.ink, fontWeight: '600', lineHeight: 21, marginVertical: 9 }, reviewStatus: { fontSize: 11, fontWeight: '800' }, correctText: { color: palette.green }, wrongText: { color: '#bd453a' }, answerLine: { color: palette.green, fontSize: 13, lineHeight: 19, fontWeight: '600', marginBottom: 4 },
});
