'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    onMobileTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

function isAllowedReturnUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === 'tilshunos:' && url.hostname === 'telegram-auth') {
      return !url.port && !url.pathname && !url.search && !url.hash;
    }

    const localHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
      || /^10(?:\.\d{1,3}){3}$/.test(url.hostname)
      || /^192\.168(?:\.\d{1,3}){2}$/.test(url.hostname)
      || /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/.test(url.hostname);
    return url.protocol === 'exp:' && localHost && url.pathname === '/--/telegram-auth'
      && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export default function MobileTelegramAuthPage() {
  const [message, setMessage] = useState('Telegram orqali tasdiqlash yuklanmoqda…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo') || '';
    const requestedRole = params.get('role');
    const role = requestedRole === 'teacher' ? 'teacher' : 'student';
    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME?.trim().replace(/^@/, '') || '';
    const validBotName = /^[a-zA-Z0-9_]{5,32}$/.test(botName) && botName.toLowerCase().endsWith('bot');

    if (!isAllowedReturnUrl(returnTo)) {
      setMessage('Ilovaga qaytish havolasi noto‘g‘ri. Ilovadan qayta urinib ko‘ring.');
      return;
    }
    if (!validBotName) {
      setMessage('Telegram orqali kirish hozircha sozlanmagan.');
      return;
    }

    const mount = document.getElementById('mobile-telegram-widget');
    if (!mount) return;
    window.onMobileTelegramAuth = (user) => {
      const target = new URL(returnTo);
      target.searchParams.set('payload', JSON.stringify({ ...user, role }));
      window.location.replace(target.toString());
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onMobileTelegramAuth(user)');
    mount.replaceChildren(script);
    setMessage('Telegram hisobingizni tanlab tasdiqlang.');

    return () => {
      mount.replaceChildren();
      delete window.onMobileTelegramAuth;
    };
  }, []);

  return <main style={{ maxWidth: 440, margin: '12vh auto', padding: 24, color: '#18392a', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
    <h1 style={{ fontSize: 25 }}>Tilshunos ilovasiga kirish</h1>
    <p style={{ color: '#5a685f', lineHeight: 1.6 }}>{message}</p>
    <div id="mobile-telegram-widget" style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }} />
  </main>;
}
