'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, saveSession } from '@/lib/api';

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tgRole, setTgRole] = useState('student');
  const telegramRole = useRef(tgRole);
  const telegramBotName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME?.trim().replace(/^@/, '') || '';
  const validTelegramBotName = /^[a-zA-Z0-9_]{5,32}$/.test(telegramBotName)
    && telegramBotName.toLowerCase().endsWith('bot');

  useEffect(() => {
    telegramRole.current = tgRole;
  }, [tgRole]);

  useEffect(() => {
    if (!validTelegramBotName) return;

    const mount = document.getElementById('telegram-widget');
    if (!mount) return;

    window.onTelegramAuth = async (user) => {
      setError('');
      try {
        const data = await api('/auth/telegram', {
          method: 'POST',
          body: JSON.stringify({ ...user, role: telegramRole.current }),
        });
        saveSession(data);
        router.push('/dashboard');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Telegram orqali kirib bo‘lmadi');
      }
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', telegramBotName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    mount.replaceChildren(script);

    return () => {
      mount.replaceChildren();
      delete window.onTelegramAuth;
    };
  }, [router, telegramBotName, validTelegramBotName]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: String(form.get('email') || '').trim(),
          password: form.get('password'),
        }),
      });
      saveSession(data);
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Email yoki parol noto‘g‘ri');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="auth-card">
        <div className="eyebrow">YANA KO‘RISHGANIMIZDAN XURSANDMIZ</div>
        <h1>Hisobingizga kiring.</h1>
        <p>O‘rganishni davom ettirish uchun ma’lumotlaringizni kiriting.</p>

        <form className="form" onSubmit={submit}>
          <label>Email<input name="email" type="email" required autoComplete="email" placeholder="siz@example.com" /></label>
          <label>Parol<input name="password" type="password" required autoComplete="current-password" placeholder="Parolingiz" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button" disabled={busy}>
            {busy ? 'Kirilmoqda...' : 'Kirish'} <span>↗</span>
          </button>
        </form>

        <div className="divider">yoki Telegram orqali</div>
        {validTelegramBotName ? (
          <>
            <label className="form" style={{ margin: '0 0 12px' }}>
              Telegram orqali yangi hisob ochish roli
              <select value={tgRole} onChange={(e) => setTgRole(e.target.value)}>
                <option value="student">O‘quvchi</option>
                <option value="teacher">O‘qituvchi</option>
              </select>
            </label>
            <div id="telegram-widget" />
          </>
        ) : (
          <p className="form-note" role="status">
            {telegramBotName
              ? 'Telegram bot username sozlamasi noto‘g‘ri. Render’da NEXT_PUBLIC_TELEGRAM_BOT_NAME qiymatini @ belgisiz, masalan tilshunos_bot shaklida kiriting.'
              : 'Telegram orqali kirish hozircha sozlanmagan.'}
          </p>
        )}

        <p className="form-note">Hisobingiz yo‘qmi? <Link href="/register">Ro‘yxatdan o‘ting</Link></p>
      </div>
    </main>
  );
}
