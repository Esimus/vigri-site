import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';

const SUPER_ADMIN_EMAILS = ['info@adet.ee']; 


const ADMIN_ROLES = new Set(['admin', 'accounting', 'kyc_reviewer', 'support']);

export async function requireAdminUser() {
  const user = await getAuthUser();
  if (!user) {

    redirect('/login');
  }

  if (ADMIN_ROLES.has(user.role)) {
    return user;
  }

  if (SUPER_ADMIN_EMAILS.includes(user.email)) {
    return user;
  }

  redirect('/dashboard'); 
}
