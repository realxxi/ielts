'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUser } from '@/lib/api';

type SessionUser = { name?: string; avatarUrl?: string } | null;

export default function SiteHeader() {
  const [user, setUser] = useState<SessionUser>(null);

  useEffect(() => {
    const syncUser = () => setUser(getUser());
    syncUser();
    window.addEventListener('tilshunos:auth-change', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('tilshunos:auth-change', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';

  return (
    <header className="topbar">
      <Link href="/" className="brand"><span className="brand-icon">t.</span> tilshunos</Link>
      <nav>
        <Link href="/courses">Kurslar</Link>
        <Link href="/tests">Testlar</Link>
        {!user && <Link href="/#how">Qanday ishlaydi</Link>}
        <Link href="/dashboard">Kabinet</Link>
      </nav>
      <div className={`top-actions${user ? ' is-authenticated' : ''}`}>
        {user ? (
          <Link className="profile-link" href="/profile" aria-label="Profilni tahrirlash" title="Profilni tahrirlash">
            <span className="profile-avatar">
              {user.avatarUrl && <img src={user.avatarUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
              <span>{initials}</span>
            </span>
          </Link>
        ) : (
          <>
            <Link className="login-link" href="/login">Kirish</Link>
            <Link className="button small" href="/register">Boshlash <span>↗</span></Link>
          </>
        )}
      </div>
      <button className="mobile-menu" aria-label="Menyu">☰</button>
    </header>
  );
}
