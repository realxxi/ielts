'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, saveSession } from '@/lib/api';

declare global { interface Window { onTelegramAuth?: (user: Record<string, unknown>) => void } }

export default function Register() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationPurpose, setVerificationPurpose] = useState<'register' | 'login'>('register');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const roleRef = useRef(role);
  const telegramBotName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME?.trim().replace(/^@/, '') || '';
  const validTelegramBotName = /^[a-zA-Z0-9_]{5,32}$/.test(telegramBotName) && telegramBotName.toLowerCase().endsWith('bot');

  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => {
    if (!validTelegramBotName || verificationEmail) return;
    const mount = document.getElementById('telegram-register-widget'); if (!mount) return;
    window.onTelegramAuth = async (user) => {
      setBusy(true); setError('');
      try { const result = await api('/auth/telegram', { method: 'POST', body: JSON.stringify({ ...user, role: roleRef.current }) }); saveSession(result); router.push('/dashboard'); }
      catch (e) { setError(e instanceof Error ? e.message : 'Telegram orqali ro‘yxatdan o‘tib bo‘lmadi'); }
      finally { setBusy(false); }
    };
    const script = document.createElement('script'); script.src = 'https://telegram.org/js/telegram-widget.js?22'; script.async = true;
    script.setAttribute('data-telegram-login', telegramBotName); script.setAttribute('data-size', 'large'); script.setAttribute('data-userpic', 'false'); script.setAttribute('data-request-access', 'write'); script.setAttribute('data-onauth', 'onTelegramAuth(user)'); mount.replaceChildren(script);
    return () => { mount.replaceChildren(); delete window.onTelegramAuth; };
  }, [validTelegramBotName, telegramBotName, verificationEmail, router]);

  async function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget);
    try { const result = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name: String(form.get('name') || '').trim(), email: String(form.get('email') || '').trim().toLowerCase(), password: form.get('password'), role }) }); setVerificationPurpose(result.purpose === 'login' ? 'login' : 'register'); setVerificationEmail(result.email); }
    catch (e) { setError(e instanceof Error ? e.message : 'Ro‘yxatdan o‘tib bo‘lmadi'); } finally { setBusy(false); }
  }
  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget);
    try { const result = await api('/auth/verify-registration', { method: 'POST', body: JSON.stringify({ email: verificationEmail, code: String(form.get('code') || '').trim() }) }); saveSession(result); router.push('/dashboard'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Emailni tasdiqlab bo‘lmadi'); } finally { setBusy(false); }
  }
  async function resendCode() { setBusy(true); setError(''); try { await api('/auth/resend-registration-code', { method: 'POST', body: JSON.stringify({ email: verificationEmail }) }); setError('Yangi tasdiqlash kodi emailingizga yuborildi.'); } catch (e) { setError(e instanceof Error ? e.message : 'Kodni qayta yuborib bo‘lmadi'); } finally { setBusy(false); } }

  const emailExists = /email.*(mavjud|ro‘yxatdan o‘tgan)|ro‘yxatdan o‘tgan/i.test(error);
  return <main className="page-shell"><div className="auth-card">
    <div className="eyebrow">TILSHUNOSGA XUSH KELIBSIZ</div>
    <h1>{verificationEmail ? (verificationPurpose === 'login' ? 'Email orqali kiring.' : 'Emailingizni tasdiqlang.') : 'Yo‘lingizni boshlang.'}</h1>
    {verificationEmail ? <>
      <p><b>{verificationEmail}</b> manziliga {verificationPurpose === 'login' ? 'akkauntga kirish' : 'ro‘yxatdan o‘tishni yakunlash'} uchun 6 xonali kod yubordik. Kod 10 daqiqa amal qiladi.</p>
      <form className="form" onSubmit={verify}><label>Tasdiqlash kodi<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="123456" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Tekshirilmoqda...' : verificationPurpose === 'login' ? 'Kirishni davom ettirish' : 'Emailni tasdiqlash'} <span>↗</span></button><button type="button" className="small-button" disabled={busy} onClick={resendCode}>Kodni qayta yuborish</button>
      </form>
    </> : <>
      <p>Hisob turini tanlang va qulay usulda ro‘yxatdan o‘ting.</p>
      <label className="role-picker">Men...<select value={role} onChange={e => setRole(e.target.value as 'student' | 'teacher')}><option value="student">O‘quvchiman — kurslarni o‘rganaman</option><option value="teacher">O‘qituvchiman — kurs yarataman</option></select></label>
      {validTelegramBotName && <div className="oauth-button" id="telegram-register-widget" />}
      {!validTelegramBotName && <p className="form-note">Telegram orqali ro‘yxatdan o‘tish hozircha sozlanmagan.</p>}
      <div className="divider">yoki email bilan</div>
      <form className="form" onSubmit={submitRegistration}>
        <label>Ism va familiya<input name="name" required minLength={2} placeholder="Ismingiz" /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required placeholder="siz@example.com" /></label>
        <label>Parol<input name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="Kamida 8 belgi" /></label>
        {error && <p className="form-error" role="alert">{error}{emailExists && <> <Link href="/login" style={{ color: '#245a3d', fontWeight: 700 }}>Kirish sahifasiga o‘tish →</Link></>}</p>}
        <button className="button" disabled={busy}>{busy ? 'Kod yuborilmoqda...' : 'Tasdiqlash kodini yuborish'} <span>↗</span></button>
      </form>
    </>}
    <p className="form-note">Hisobingiz bormi? <Link href="/login">Kirish</Link></p>
  </div></main>;
}
