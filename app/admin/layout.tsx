// app/admin/layout.tsx
import { ReactNode } from 'react';
import { requireAdminUser } from '@/lib/adminAuth';

export const metadata = {
  title: 'VIGRI Admin',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminUser();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-slate-200 p-4 text-sm">
        <div className="font-semibold mb-4">
          VIGRI Admin
        </div>
        <div className="text-xs text-slate-500 mb-4">
          {user.email}
        </div>
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
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
