import { AppShell } from '@/components/AppShell';

export default async function AppLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  return <AppShell locale={locale}>{children}</AppShell>;
}
