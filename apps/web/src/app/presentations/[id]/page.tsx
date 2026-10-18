'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function PresentationPage() {
  const { id } = useParams<{ id: string }>();
  const [presentation, setPresentation] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/presentations/${id}`).then(setPresentation).catch((e) => setError(e.message)); }, [id]);
  return <main className="page-shell">
    <Link href="/dashboard" className="text-button">← Boshqaruv paneliga qaytish</Link>
    {error ? <div className="empty-state">{error}</div> : !presentation ? <div className="empty-state">Prezentatsiya yuklanmoqda...</div> : <>
      <h1 className="page-title">{presentation.title}</h1>
      <iframe className="presentation-frame" title={presentation.title} srcDoc={presentation.html} sandbox="allow-scripts" />
    </>}
  </main>;
}
