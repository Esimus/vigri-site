// app/dev/presale/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';

type Tier = {
  id: number;
  supplyTotal: number;
  supplyMinted: number;
  adminMinted: number;
  kycRequired: boolean;
  inviteOnly: boolean;
  transferable: boolean;
  priceLamports: number;
  priceSol: number;
};

type GlobalConfigResponse = {
  exists: boolean;
  pda?: string;
  admin?: string | null;
  treasury?: string | null;
  tiers?: Tier[];
  cluster?: string;
};

type GlobalConfigOrError =
  | GlobalConfigResponse
  | { error: string; details?: string; message?: string };

function isGlobalConfigResponse(value: GlobalConfigOrError): value is GlobalConfigResponse {
  return typeof value === 'object' && value !== null && 'exists' in value;
}

async function fetchGlobalConfig(): Promise<{
  status: number;
  body: GlobalConfigOrError;
}> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const res = await fetch(`${baseUrl}/api/presale/global-config`, {
    cache: 'no-store',
  });

  const data = (await res.json().catch(() => ({}))) as GlobalConfigOrError;

  return {
    status: res.status,
    body: data,
  };
}

export default async function PresaleDevPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const result = await fetchGlobalConfig();
  const body = result.body;

  const tiers: Tier[] =
    isGlobalConfigResponse(body) && Array.isArray(body.tiers) ? body.tiers : [];

  const pda =
    isGlobalConfigResponse(body) && typeof body.pda === 'string' ? body.pda : null;

  const admin =
    isGlobalConfigResponse(body) && typeof body.admin === 'string' ? body.admin : null;

  const cluster =
    isGlobalConfigResponse(body) && typeof body.cluster === 'string' ? body.cluster : null;

  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">NFT Presale · Dev view</h1>

        <p className="text-sm text-gray-600">Read-only debug view of GlobalConfig (mainnet).</p>

        {(pda || admin || cluster) && (
          <div className="text-xs font-mono space-y-1">
            {cluster && (
              <div>
                <span className="font-semibold">Cluster:</span> {cluster}
              </div>
            )}
            {pda && (
              <div>
                <span className="font-semibold">GlobalConfig PDA:</span> {pda}
              </div>
            )}
            {admin && (
              <div>
                <span className="font-semibold">Admin:</span> {admin}
              </div>
            )}
          </div>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tiers (from chain)</h2>

        {tiers.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div key={tier.id} className="rounded-lg border p-4 text-sm space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-semibold">Tier #{tier.id}</div>
                  <div className="font-mono text-xs">
                    {tier.priceSol > 0 ? `${tier.priceSol} SOL` : 'TBA'}
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  {tier.supplyMinted}/{tier.supplyTotal} minted
                </div>

                <ul className="text-xs space-y-1">
                  <li>KYC required: {tier.kycRequired ? 'yes' : 'no'}</li>
                  <li>Invite only: {tier.inviteOnly ? 'yes' : 'no'}</li>
                  <li>Transferable: {tier.transferable ? 'yes' : 'no'}</li>
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No tiers data available (check API).</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Raw response</h2>
        <div className="rounded-lg border p-3 text-xs font-mono">
          <div className="mb-1">
            <span className="font-semibold">Status:</span> {result.status}
          </div>
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(body, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}
