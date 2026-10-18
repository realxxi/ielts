'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Question = { number: number; question: string; options: Record<string, string> };

export default function TakeTest() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/tests/${id}`).then(setTest).catch((e) => setError(e.message));
  }, [id]);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      setResult(await api(`/tests/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Javoblarni yuborib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  }

  if (error && !test) return <main className="page-shell"><Link href="/tests">← Testlarga qaytish</Link><div className="empty-state">{error}</div></main>;
  if (!test) return <main className="page-shell">Test yuklanmoqda...</main>;

  return (
    <main className="page-shell">
      <Link href="/tests" className="text-button">← Barcha testlar</Link>
      <div className="eyebrow" style={{ marginTop: 24 }}>{test.level} DARAJA · {test.questions.length} TA SAVOL</div>
      <h1 className="page-title">{test.title}</h1>
      <p className="page-intro">Har bir savol uchun bitta javob tanlang. Testni login qilmasdan ham yechishingiz mumkin. Yakunda natijangiz va to‘g‘ri javoblar ko‘rsatiladi.</p>

      {result && <div className="data-row" style={{ margin: '22px 0' }}>
        <div><h2 style={{ font: '500 24px Georgia', margin: '0 0 5px' }}>Natijangiz: {result.score} / {result.total}</h2><p>{result.percentage}% to‘g‘ri javob</p></div>
        <span className="badge">{result.percentage >= 80 ? 'Ajoyib natija!' : result.percentage >= 50 ? 'Yaxshi urinish!' : 'Yana bir bor urinib ko‘ring!'}</span>
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}

      <div style={{ display: 'grid', gap: 15, marginTop: 25 }}>
        {(test.questions as Question[]).map((q, i) => {
          const review = result?.results?.[i];
          return <article className="auth-card" key={q.number} style={{ maxWidth: 'none', margin: 0, padding: '22px 25px' }}>
            <div className="course-level">SAVOL {q.number}</div>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.75, margin: '12px 0 18px' }}>{q.question}</p>
            <div className="two-col">
              {Object.entries(q.options).map(([letter, label]) => <label key={letter} className="lesson" style={{ cursor: result ? 'default' : 'pointer', background: review ? (review.correctAnswer === letter ? '#e9f4e4' : review.selected === letter ? '#f9e8e6' : '#f7f9f5') : answers[String(q.number)] === letter ? '#eaf2e5' : '#f7f9f5' }}>
                <input type="radio" name={`q-${q.number}`} value={letter} checked={answers[String(q.number)] === letter} disabled={!!result} onChange={() => setAnswers((current) => ({ ...current, [String(q.number)]: letter }))} />
                <b>{letter}.</b><span>{label}</span>
                {review?.correctAnswer === letter && <span style={{ marginLeft: 'auto', color: '#47754b' }}>To‘g‘ri ✓</span>}
              </label>)}
            </div>
          </article>;
        })}
      </div>

      {!result
        ? <button className="button" style={{ marginTop: 24 }} onClick={submit} disabled={busy}>{busy ? 'Tekshirilmoqda...' : 'Testni yakunlash'} <span>↗</span></button>
        : <button className="outline-button" style={{ marginTop: 24, cursor: 'pointer' }} onClick={() => { setResult(null); setAnswers({}); }}>Qayta ishlash ↻</button>}
    </main>
  );
}
