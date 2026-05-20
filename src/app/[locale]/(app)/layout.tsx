import { AppShell } from '@/components/AppShell';

export default function AppLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return <AppShell locale={locale}>{children}</AppShell>;
}
