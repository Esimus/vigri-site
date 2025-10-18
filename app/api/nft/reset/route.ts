import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL('/dashboard/nft', req.url));
  res.cookies.set({ name: 'vigri_nfts', value: '', path: '/', maxAge: 0 });
  return res;
}
