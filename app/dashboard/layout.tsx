// app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { getCookie } from '@/lib/cookies';
import { DashboardShell } from '@/components/layout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCookie('vigri_session');

  if (!session) {
    redirect('/');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
