// app/presale/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "VIGRI Presale",
  description: "NFT-based presale to kickstart VIGRI development.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">VIGRI Presale</h1>
      <p className="mt-3 text-zinc-600">
        The VIGRI presale will use <strong>NFT passes</strong> so supporters can contribute and receive
        utility-based access and recognition. Funds go toward smart-contract work, site and club tools.
        Nothing here is investment advice.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Tier 1 */}
        <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="text-xs text-zinc-500">Tier 1</div>
          <div className="mt-1 text-lg font-semibold">Access Pass NFT</div>
          <ul className="mt-3 text-sm text-zinc-600 list-disc pl-5 space-y-1">
            <li>Early access to features</li>
            <li>Allowlist perks for club drops</li>
            <li>Community badge in Telegram</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary opacity-60 cursor-not-allowed">Connect wallet (soon)</button>
            <Link href="/docs/litepaper" className="btn btn-outline">Read litepaper</Link>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="text-xs text-zinc-500">Tier 2</div>
          <div className="mt-1 text-lg font-semibold">Founder Supporter NFT</div>
          <ul className="mt-3 text-sm text-zinc-600 list-disc pl-5 space-y-1">
            <li>Name credit on the site (optional)</li>
            <li>Priority for early club experiences</li>
            <li>Higher weight in community polls</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary opacity-60 cursor-not-allowed">Connect wallet (soon)</button>
            <Link href="/docs/litepaper" className="btn btn-outline">Read litepaper</Link>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600">
        This page is a preview. On-chain mint links and wallet connect will appear here after audits and setup.
      </div>

      <div className="mt-6">
        <a href="https://t.me/cryptovigri" target="_blank" className="btn btn-outline">Join Telegram</a>
      </div>
    </main>
  );
}
