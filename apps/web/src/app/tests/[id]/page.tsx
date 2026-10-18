'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Question = { number: number; question: string; options: Record<string, string> };
type QuestionResult = { number: number; selected: string | null; correctAnswer: string; correct: boolean };

export default function TakeTest() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);

  useEffect(() => {
    api(`/tests/${id}`).then(setTest).catch((e) => setError(e.message));
  }, [id]);

  async function submit() {
    const unansweredIndex = test.questions.findIndex((question: Question) => !answers[String(question.number)]);
    if (unansweredIndex !== -1) {
      setActiveIndex(unansweredIndex);
      setShowQuestionGrid(true);
      setError('Testni yakunlashdan oldin barcha savollarga javob bering. Belgilanmagan savollar raqamlari ro‘yxatda ko‘rsatilgan.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      setResult(await api(`/tests/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }));
      setActiveIndex(0);
      setShowQuestionGrid(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Javoblarni yuborib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  }

  if (error && !test) return <main className="page-shell"><Link href="/tests">← Testlarga qaytish</Link><div className="empty-state">{error}</div></main>;
  if (!test) return <main className="page-shell">Test yuklanmoqda...</main>;

  const questions: Question[] = test.questions || [];
  const question = questions[activeIndex];
  const answeredCount = questions.filter((item) => Boolean(answers[String(item.number)])).length;
  const currentResult: QuestionResult | undefined = result?.results?.find((item: QuestionResult) => item.number === question.number);

  if (result) return (
    <main className="page-shell test-taking-page">
      <Link href="/tests" className="text-button">← Barcha testlar</Link>
      <div className="test-heading">
        <div className="eyebrow">TEST NATIJASI · {test.level}</div>
        <h1 className="page-title">{test.title}</h1>
      </div>
      <div className="data-row test-result-summary">
        <div><h2>Natijangiz: {result.score} / {result.total}</h2><p>{result.percentage}% to‘g‘ri javob</p></div>
        <span className="badge">{result.percentage >= 80 ? 'Ajoyib natija!' : result.percentage >= 50 ? 'Yaxshi urinish!' : 'Yana bir bor urinib ko‘ring!'}</span>
      </div>
      <section className="test-review-list" aria-label="Barcha savollar natijasi">
        {questions.map((item) => {
          const review: QuestionResult | undefined = result.results?.find((entry: QuestionResult) => entry.number === item.number);
          return <article className="test-review-card" key={item.number}>
            <div className="test-question-meta"><span>SAVOL {item.number}</span><span className={review?.correct ? 'review-correct-label' : 'review-incorrect-label'}>{review?.correct ? 'To‘g‘ri ✓' : `Noto‘g‘ri · To‘g‘ri javob: ${review?.correctAnswer}`}</span></div>
            <h2>{item.question}</h2>
            <div className="test-answer-list">
              {Object.entries(item.options).map(([letter, label]) => {
                const correct = review?.correctAnswer === letter;
                const selectedWrong = review?.selected === letter && !review?.correct;
                return <div key={letter} className={`test-answer review-answer${correct ? ' is-correct' : ''}${selectedWrong ? ' is-incorrect' : ''}`}>
                  <span className="test-answer-letter">{letter}</span><span>{label}</span>
                  {correct && <span className="answer-mark">To‘g‘ri javob ✓</span>}
                  {selectedWrong && <span className="review-wrong-mark">Sizning javobingiz</span>}
                </div>;
              })}
            </div>
          </article>;
        })}
      </section>
      <button type="button" className="button test-restart-button" onClick={() => { setResult(null); setAnswers({}); setActiveIndex(0); setError(''); }}>Testni qayta ishlash <span>↻</span></button>
    </main>
  );

  return (
    <main className="page-shell test-taking-page">
      <Link href="/tests" className="text-button">← Barcha testlar</Link>
      <div className="test-heading">
        <div className="eyebrow">{test.level} DARAJA · {questions.length} TA SAVOL</div>
        <h1 className="page-title">{test.title}</h1>
        <p className="page-intro">Har safar bitta savol ko‘rsatiladi. Javoblaringiz avtomatik belgilanadi. Testni login qilmasdan ham yechishingiz mumkin.</p>
      </div>

      {result && <div className="data-row test-result-summary">
        <div><h2>Natijangiz: {result.score} / {result.total}</h2><p>{result.percentage}% to‘g‘ri javob</p></div>
        <span className="badge">{result.percentage >= 80 ? 'Ajoyib natija!' : result.percentage >= 50 ? 'Yaxshi urinish!' : 'Yana bir bor urinib ko‘ring!'}</span>
      </div>}

      <section className="test-workspace" aria-label="Test savollari">
        <div className="test-progress-row">
          <span>{result ? 'Javoblarni ko‘rib chiqish' : `Javoblangan: ${answeredCount} / ${questions.length}`}</span>
          <button type="button" className="question-list-toggle" aria-expanded={showQuestionGrid} onClick={() => setShowQuestionGrid((shown) => !shown)}>
            Savollar <span>{activeIndex + 1} / {questions.length}</span> <span aria-hidden="true">{showQuestionGrid ? '⌃' : '⌄'}</span>
          </button>
        </div>
        <div className="test-progress-track"><span style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>

        {showQuestionGrid && <div className="question-grid-panel">
          <div className="question-grid" aria-label="Savol raqamlari">
            {questions.map((item, index) => {
              const selected = Boolean(answers[String(item.number)]);
              const review = result?.results?.find((entry: QuestionResult) => entry.number === item.number);
              const stateClass = review ? (review.correct ? 'is-correct' : 'is-incorrect') : selected ? 'is-answered' : 'is-unanswered';
              return <button type="button" key={item.number} className={`question-number ${stateClass}${activeIndex === index ? ' is-current' : ''}`} aria-label={`Savol ${item.number}${selected ? ', javoblangan' : ', javobsiz'}`} aria-current={activeIndex === index ? 'step' : undefined} onClick={() => { setActiveIndex(index); setError(''); }}>
                {item.number}
              </button>;
            })}
          </div>
          <div className="question-grid-legend"><span><i className="legend-dot answered" /> Javoblangan</span><span><i className="legend-dot unanswered" /> Javobsiz</span>{result && <span><i className="legend-dot incorrect" /> Noto‘g‘ri</span>}</div>
        </div>}

        {error && <p className="form-error test-error" role="alert">{error}</p>}

        <article className="test-question-card">
          <div className="test-question-meta"><span>SAVOL {question.number}</span><span>{activeIndex + 1} / {questions.length}</span></div>
          <h2>{question.question}</h2>
          {currentResult && <p className={`answer-feedback ${currentResult.correct ? 'correct' : 'incorrect'}`}>
            {currentResult.correct ? 'To‘g‘ri javob!' : `To‘g‘ri javob: ${currentResult.correctAnswer}`}
          </p>}
          <div className="test-answer-list">
            {Object.entries(question.options).map(([letter, label]) => {
              const isSelected = answers[String(question.number)] === letter;
              const isCorrect = currentResult?.correctAnswer === letter;
              const isWrongSelection = !!currentResult && isSelected && !currentResult.correct;
              return <button type="button" key={letter} className={`test-answer${isSelected ? ' is-selected' : ''}${isCorrect ? ' is-correct' : ''}${isWrongSelection ? ' is-incorrect' : ''}`} disabled={!!result} aria-pressed={isSelected} onClick={() => { setAnswers((current) => ({ ...current, [String(question.number)]: letter })); setError(''); }}>
                <span className="test-answer-letter">{letter}</span><span>{label}</span>
                {isCorrect && <span className="answer-mark">✓</span>}
              </button>;
            })}
          </div>
        </article>

        <div className="test-navigation">
          <button type="button" className="test-nav-button" disabled={activeIndex === 0} onClick={() => { setActiveIndex((index) => index - 1); setError(''); }}>← Oldingi savol</button>
          <span className="test-nav-count">{activeIndex + 1} / {questions.length}</span>
          {activeIndex < questions.length - 1
            ? <button type="button" className="button" onClick={() => { setActiveIndex((index) => index + 1); setError(''); }}>Keyingi savol <span>→</span></button>
            : result
              ? <button type="button" className="button" onClick={() => { setResult(null); setAnswers({}); setActiveIndex(0); setError(''); }}>Qayta ishlash <span>↻</span></button>
              : <button type="button" className="button" disabled={busy} onClick={submit}>{busy ? 'Tekshirilmoqda...' : 'Testni yakunlash'} <span>↗</span></button>}
        </div>
      </section>
    </main>
  );
}
