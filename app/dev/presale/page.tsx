import React from 'react';

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
  pda: string;
  admin: string;
  tiers: Tier[];
};

type GlobalConfigOrError =
  | GlobalConfigResponse
  | { error: string; details?: string; message?: string };

function isGlobalConfigResponse(value: GlobalConfigOrError): value is GlobalConfigResponse {
  return typeof value === 'object' && value !== null && 'exists' in value;
}

async function fetchGlobalConfig(): Promise<{
  status: number;
  body: GlobalConfigResponse | { error: string; details?: string; message?: string };
}> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const res = await fetch(`${baseUrl}/api/presale/global-config`, {
    cache: 'no-store',
  });

  const data = await res.json();
  return {
    status: res.status,
    body: data,
  };
}

// NOTE: Business rule reminder:
// After 2025-12-31 NFT prices are planned to be doubled.
// This page shows current on-chain base prices only.

export default async function PresaleDevPage() {
  const result = await fetchGlobalConfig();
  const body: GlobalConfigOrError = result.body;

  const tiers: Tier[] =
    isGlobalConfigResponse(body) && Array.isArray(body.tiers) ? body.tiers : [];

  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">NFT Presale · Dev view</h1>

        <p className="text-sm text-gray-600">
          Read-only debug view of GlobalConfig from devnet.
        </p>

        <p className="text-xs text-gray-500">
          Note: business rule says NFT prices are planned to double after
          2025-12-31. This dev page shows current on-chain base prices only.
        </p>

        {body && 'pda' in body && 'admin' in body && (
          <div className="text-xs font-mono space-y-1">
            <div>
              <span className="font-semibold">GlobalConfig PDA:</span>{' '}
              {body.pda}
            </div>
            <div>
              <span className="font-semibold">Admin:</span> {body.admin}
            </div>
          </div>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tiers (from chain)</h2>

        {Array.isArray(tiers) && tiers.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className="rounded-lg border p-4 text-sm space-y-2"
              >
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
          <p className="text-sm text-gray-600">
            No tiers data available (check devnet or API).
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Raw response</h2>
        <div className="rounded-lg border p-3 text-xs font-mono">
          <div className="mb-1">
            <span className="font-semibold">Status:</span> {result.status}
          </div>
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(body, null, 2)}
          </pre>
        </div>
      </section>
    </main>
  );
}
