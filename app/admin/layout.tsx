// app/admin/layout.tsx
import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { requireAdminUser } from '@/lib/adminAuth';
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle';

export const metadata = {
  title: 'VIGRI Admin',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminUser();

  const cookieStore = await cookies();
  const resolved = cookieStore.get('vigri_theme_resolved')?.value;
  const initialTheme: 'light' | 'dark' = resolved === 'dark' ? 'dark' : 'light';

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="font-semibold mb-1">VIGRI Admin</div>
        <div className="text-xs text-slate-500 mb-4">{user.email}</div>

        <AdminThemeToggle initialTheme={initialTheme} />

        <nav className="space-y-2">
          <a href="/admin" className="block hover:underline">
            Overview
          </a>
          <a href="/admin/reports" className="block hover:underline">
            Reports
          </a>
          <a href="/admin/users" className="block hover:underline">
            Users
          </a>
          <a href="/admin/kyc" className="block hover:underline">
            KYC
          </a>
          <a href="/admin/support" className="block hover:underline">
            Support
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
