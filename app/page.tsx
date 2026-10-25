// app/page.tsx
import { connection } from 'next/server';
import HomeClient from './HomeClient';

export default async function Page() {
  // Keep request-time rendering for the query-driven authentication UI.
  await connection();
  return <HomeClient />;
}
