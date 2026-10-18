import './styles.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/site-header';
export const metadata: Metadata = { title: 'Tilshunos — yangi til, yangi imkoniyat', description: 'O‘zingizga mos kursni toping va chet tilini o‘rganishni bugun boshlang.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="uz"><body><SiteHeader />{children}<footer><Link href="/" className="brand"><span className="brand-icon">t.</span> tilshunos</Link><span>Til o‘rganish — dunyo sari qadam.</span><span>© 2026 Tilshunos</span></footer></body></html>; }
