'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUser } from '@/lib/api';

export default function HowSection() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const syncVisibility = () => setVisible(!getUser());
    syncVisibility();
    window.addEventListener('tilshunos:auth-change', syncVisibility);
    window.addEventListener('storage', syncVisibility);
    return () => {
      window.removeEventListener('tilshunos:auth-change', syncVisibility);
      window.removeEventListener('storage', syncVisibility);
    };
  }, []);

  if (!visible) return null;

  return (
    <section className="manifesto" id="how">
      <div className="manifesto-star">✳</div>
      <div className="eyebrow">BIZNING YONDASHUV</div>
      <h2>Til o‘rganish — bu<br />qoidalar emas. Bu <span>his.</span></h2>
      <p>Haqiqiy suhbatlar, sizga mos darslar va har kuni ozgina mashq. O‘zingiz istagan hayotga olib boradigan tilni o‘rganing.</p>
      <Link href="/register" className="button light-button">O‘z yo‘lingizni boshlang <span>↗</span></Link>
      <div className="manifesto-index">01 — 03</div>
    </section>
  );
}
