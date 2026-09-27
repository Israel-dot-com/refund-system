import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RefundAI — AI-Powered Refund Processing',
  description: 'Instant, policy-grounded refund decisions powered by AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-cream font-sans">
        {/* ── Navigation ── */}
        <nav className="bg-white border-b border-border sticky top-0 z-30">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-14 flex items-center justify-between gap-8">
            {/* Brand */}
            <Link href="/" className="font-bold text-ink tracking-tight shrink-0">
              RefundAI
            </Link>

            {/* Center links */}
            <div className="flex items-center gap-1 text-sm font-medium tracking-wide uppercase">
              <Link
                href="/"
                className="px-3 py-1.5 text-ink-2 hover:text-ink transition-colors rounded-md hover:bg-cream"
              >
                Portal
              </Link>
              <Link
                href="/admin"
                className="px-3 py-1.5 text-ink-2 hover:text-ink transition-colors rounded-md hover:bg-cream"
              >
                Admin
              </Link>
            </div>

            {/* Right CTA */}
            <Link
              href="/admin"
              className="shrink-0 bg-orange text-white text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-sm hover:bg-orange-dark transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </nav>

        <main>{children}</main>
      </body>
    </html>
  );
}
