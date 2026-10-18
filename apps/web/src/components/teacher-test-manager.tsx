'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type QuestionDraft = { question: string; options: Record<'A' | 'B' | 'C' | 'D', string>; answer: 'A' | 'B' | 'C' | 'D' };
const blankQuestion = (): QuestionDraft => ({ question: '', options: { A: '', B: '', C: '', D: '' }, answer: 'A' });

export default function TeacherTestManager() {
  const [tests, setTests] = useState<any[]>([]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([blankQuestion()]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('A1');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadTests() { try { setTests(await api('/tests/mine')); } catch (e) { setError(e instanceof Error ? e.message : 'Testlaringizni yuklab bo‘lmadi'); } }
  useEffect(() => { loadTests(); }, []);
  function updateQuestion(index: number, update: (question: QuestionDraft) => QuestionDraft) { setQuestions((current) => current.map((question, i) => i === index ? update(question) : question)); }
  function resetForm() { setEditingId(null); setTitle(''); setLevel('A1'); setQuestions([blankQuestion()]); }
  async function editTest(id: string) {
    setError(''); setNotice('');
    try { const test = await api(`/tests/${id}/manage`); setEditingId(id); setTitle(test.title); setLevel(test.level); setQuestions(test.questions.map((q: any) => ({ question: q.question, options: q.options, answer: q.answer }))); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Testni ochib bo‘lmadi'); }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    const payload = { title: title.trim(), level, questions: questions.map((question, index) => ({ ...question, number: index + 1 })) };
    try { await api(editingId ? `/tests/${editingId}` : '/tests', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); setNotice(editingId ? 'Test yangilandi.' : 'Test yaratildi va testlar katalogiga qo‘shildi.'); resetForm(); await loadTests(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Testni saqlab bo‘lmadi'); } finally { setBusy(false); }
  }
  async function deleteTest(id: string) { if (!window.confirm('Testni butunlay o‘chirishni tasdiqlaysizmi?')) return; try { await api(`/tests/${id}`, { method: 'DELETE' }); if (editingId === id) resetForm(); setNotice('Test o‘chirildi.'); await loadTests(); } catch (e) { setError(e instanceof Error ? e.message : 'Testni o‘chirib bo‘lmadi'); } }

  return <section className="teacher-test-manager">
    <div className="auth-card teacher-test-form">
      <div className="eyebrow">O‘QITUVCHI TESTI</div><h2>{editingId ? 'Testni tahrirlash' : 'Yangi test tuzing'}</h2>
      <p>Savollarni, to‘rtta javob variantini va to‘g‘ri javobni qo‘lda kiriting. Yaratilgan test katalogda ko‘rinadi.</p>
      <form className="form" onSubmit={submit}>
        <label>Test nomi<input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} placeholder="Masalan: Ingliz tili A1 — 1-test" /></label>
        <label>Til darajasi<select value={level} onChange={(e) => setLevel(e.target.value)}><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option></select></label>
        {questions.map((question, index) => <fieldset className="teacher-question" key={index}><legend>Savol {index + 1}</legend>
          <label>Savol matni<textarea required value={question.question} onChange={(e) => updateQuestion(index, (current) => ({ ...current, question: e.target.value }))} placeholder="Savol matnini yozing" /></label>
          <div className="teacher-options-grid">{(['A', 'B', 'C', 'D'] as const).map((letter) => <label key={letter}>{letter} javob<input required value={question.options[letter]} onChange={(e) => updateQuestion(index, (current) => ({ ...current, options: { ...current.options, [letter]: e.target.value } }))} placeholder={`${letter} variant`} /></label>)}</div>
          <label>To‘g‘ri javob<select value={question.answer} onChange={(e) => updateQuestion(index, (current) => ({ ...current, answer: e.target.value as QuestionDraft['answer'] }))}><option value="A">A javob</option><option value="B">B javob</option><option value="C">C javob</option><option value="D">D javob</option></select></label>
          {questions.length > 1 && <button type="button" className="small-button danger" onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))}>Savolni olib tashlash</button>}
        </fieldset>)}
        <button type="button" className="small-button" onClick={() => setQuestions((current) => [...current, blankQuestion()])}>+ Savol qo‘shish</button>
        {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="profile-success" role="status">{notice}</p>}
        <button className="button" disabled={busy}>{busy ? 'Saqlanmoqda...' : editingId ? 'O‘zgarishlarni saqlash' : 'Testni yaratish'} <span>↗</span></button>
        {editingId && <button type="button" className="small-button" onClick={resetForm}>Tahrirlashni bekor qilish</button>}
      </form>
    </div>
    <div className="teacher-tests-list"><h2>Yaratgan testlarim</h2>
      {tests.map((test) => <div className="data-row" key={test._id}><div><h3>{test.title}</h3><p>{test.level} · {test.questionCount} ta savol · Ommaviy</p></div><div className="row-actions"><Link className="small-button primary" href={`/tests/${test._id}`}>Testni ko‘rish</Link><button type="button" className="small-button" onClick={() => editTest(test._id)}>Tahrirlash</button><button type="button" className="small-button danger" onClick={() => deleteTest(test._id)}>O‘chirish</button></div></div>)}
      {!tests.length && <div className="empty-state">Hali test yaratmagansiz.</div>}
    </div>
  </section>;
}
