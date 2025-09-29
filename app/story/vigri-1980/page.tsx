// app/story/vigri-1980/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'The name “VIGRI” (1980) — backstory',
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Why the name “VIGRI”?</h1>

      <p className="mt-4 text-zinc-700">
        A gentle nod to 1980 on the Baltic — sailing, fair play, and a friendly spirit of openness and support.
        We keep the spirit, not any official brand or affiliation.
      </p>

      <p className="mt-4 text-zinc-700">
        We’ll expand this page with verified historical context, visuals, and proper credits to the original creator.
      </p>

      <div className="mt-8 p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-600">
        This page provides cultural context only and does not imply endorsement, affiliation, or rights to third-party brands.
      </div>
    </main>
  );
}
