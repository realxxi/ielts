'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, getUser } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getUser()) {
      router.replace('/login');
      return;
    }
    api('/auth/me').then(setProfile).catch((e) => setError(e.message));
  }, [router]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const form = new FormData(e.currentTarget);
    try {
      const updated = await api('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: form.get('name'), avatarUrl: form.get('avatarUrl') }),
      });
      setProfile(updated);
      const current = getUser();
      localStorage.setItem('tilshunos_user', JSON.stringify({ ...current, name: updated.name, avatarUrl: updated.avatarUrl }));
      window.dispatchEvent(new Event('tilshunos:auth-change'));
      setNotice('Profil ma’lumotlari saqlandi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profilni saqlab bo‘lmadi');
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <main className="page-shell">{error ? <div className="empty-state">{error}</div> : 'Profil yuklanmoqda...'}</main>;

  return (
    <main className="page-shell">
      <Link href="/dashboard" className="text-button">← Kabinetga qaytish</Link>
      <section className="auth-card profile-card">
        <div className="eyebrow">SHAXSIY MA’LUMOTLAR</div>
        <h1>Profilni tahrirlash</h1>
        <p>Ismingiz va profil rasmingizni yangilang.</p>
        <div className="profile-preview">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Profil rasmi" /> : <span>{profile.name?.trim().split(/\s+/).slice(0, 2).map((x: string) => x[0]).join('').toUpperCase()}</span>}
        </div>
        <form className="form" onSubmit={save}>
          <label>Ism va familiya<input name="name" required minLength={2} defaultValue={profile.name || ''} /></label>
          <label>Email<input type="email" value={profile.email || ''} readOnly /></label>
          <label>Profil rasmi havolasi (HTTPS)<input name="avatarUrl" type="url" defaultValue={profile.avatarUrl || ''} placeholder="https://..." /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="profile-success" role="status">{notice}</p>}
          <button className="button" disabled={busy}>{busy ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'} <span>↗</span></button>
        </form>
      </section>
    </main>
  );
}
