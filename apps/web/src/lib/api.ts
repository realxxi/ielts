const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export async function api(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tilshunos_token') : null;
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'So‘rovni bajarib bo‘lmadi');
  return data;
}
export function saveSession(data: any) { localStorage.setItem('tilshunos_token', data.accessToken); localStorage.setItem('tilshunos_user', JSON.stringify(data.user)); window.dispatchEvent(new Event('tilshunos:auth-change')); }
export function getUser() { try { return JSON.parse(localStorage.getItem('tilshunos_user') || 'null'); } catch { return null; } }
