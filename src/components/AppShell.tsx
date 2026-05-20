'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CalendarDays, Compass, Flag, Home, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppShell({ locale, children }: { locale: string; children: React.ReactNode }) {
  const t = useTranslations('common');
  const path = usePathname();
  const tabs = [
    { href: `/${locale}/dashboard`, label: t('today'), icon: Home },
    { href: `/${locale}/plan`, label: t('plan'), icon: CalendarDays },
    { href: `/${locale}/races`, label: 'Courses', icon: Flag },
    { href: `/${locale}/profile`, label: t('profile'), icon: User },
  ];
  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-64">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-fjord-100 bg-white px-4 py-6 gap-1">
        <Link href={`/${locale}/dashboard`} className="text-xl font-semibold text-fjord-900 px-3 pb-6">
          Nordic Run
        </Link>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = path?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                active ? 'bg-fjord-100 text-fjord-900' : 'text-fjord-700 hover:bg-fjord-50',
              )}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </aside>
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6">{children}</main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-fjord-100 grid grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = path?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center py-2 text-xs',
                active ? 'text-fjord-700' : 'text-fjord-500',
              )}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
