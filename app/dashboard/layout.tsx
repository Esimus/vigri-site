import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/DashboardShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get('vigri_session')?.value;
  if (!session) redirect('/login');

  return <DashboardShell>{children}</DashboardShell>;
}
