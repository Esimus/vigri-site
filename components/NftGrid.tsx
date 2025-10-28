// components/NftGrid.tsx
'use client';

import { useEffect, useState } from 'react';

type Item = {
  id: string;
  name: string;
  blurb: string;
  eurPrice: number;
  vigriPrice: number;
  kycRequired?: boolean;
  limited?: number;
  vesting?: string | null;
  ownedQty?: number;
  invited?: boolean; // only for WS-20
};

type ListResp = { ok: true; items: Item[] };
type ErrorResp = { ok: false; error?: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function isListResp(v: unknown): v is ListResp {
  return isObject(v) && v.ok === true && Array.isArray(v.items);
}
function isErrorResp(v: unknown): v is ErrorResp {
  return isObject(v) && v.ok === false;
}
function hasQty(v: unknown): v is { qty: number } {
  return isObject(v) && typeof v.qty === 'number';
}

export default function NftGrid() {
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});

  const load = async () => {
    const r = await fetch('/api/nft', { cache: 'no-store' });
    const j: unknown = await r.json().catch(() => ({}));
    if (r.ok && isListResp(j)) {
      setItems(j.items);
      const q: Record<string, number> = {};
      j.items.forEach((i) => {
        q[i.id] = 1;
      });
      setQty(q);
    } else {
      setItems([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const postJson = async <T extends object>(url: string, body: T) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const buy = async (id: string) => {
    setMsg(null);
    const amount = qty[id] ?? 1;
    const r = await postJson('/api/nft', { id, qty: amount });
    const j: unknown = await r.json().catch(() => ({}));

    if (!r.ok) {
      const err =
        (isErrorResp(j) && j.error) ||
        (isObject(j) && typeof j.error === 'string' && j.error) ||
        'Purchase failed (mock).';
      setMsg(err);
      return;
    }

    // сервер может вернуть qty; если нет — аккуратно обновим локально
    const newOwned =
      hasQty(j) ? j.qty : (items.find((i) => i.id === id)?.ownedQty ?? 0) + amount;

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ownedQty: newOwned } : i))
    );
    setMsg('Done ✔');
  };

  // DEV: Quickly issue/revoke an invite for WS-20
  const grantInvite = async (grant: boolean) => {
    await postJson('/api/nft/ws/invite', { grant });
    await load();
    setMsg(grant ? 'Invite granted (mock).' : 'Invite revoked (mock).');
  };

  const cf = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {msg ? (
          <div className="text-sm">
            {msg}{' '}
            {msg?.includes('KYC') && (
              <a className="underline ml-2" href="/kyc">
                Start KYC
              </a>
            )}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {/* dev-only кнопки инвайта */}
          <button
            className="rounded-xl border px-3 py-1 text-xs"
            onClick={() => grantInvite(true)}
          >
            Grant WS invite
          </button>
          <button
            className="rounded-xl border px-3 py-1 text-xs"
            onClick={() => grantInvite(false)}
          >
            Revoke invite
          </button>
          <form action="/api/nft/reset" method="POST">
            <button className="rounded-xl border px-3 py-1 text-xs">
              Reset purchases
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((i) => {
          const isWS = i.id === 'nft-ws-20';
          const owned = (i.ownedQty || 0) > 0;

          return (
            <div key={i.id} className="border rounded-2xl p-4 space-y-2">
              <div className="h-32 rounded-xl border flex items-center justify-center text-sm opacity-70">
                NFT Preview
              </div>

              <div className="font-medium">{i.name}</div>
              <div className="text-sm opacity-70">{i.blurb}</div>

              {i.eurPrice > 0 ? (
                <div className="text-sm">
                  Price: <b>{cf.format(i.eurPrice)}</b> (~
                  {i.vigriPrice.toLocaleString()} VIGRI)
                </div>
              ) : (
                <div className="text-sm opacity-70">Invite-only (not for sale)</div>
              )}

              {i.vesting && (
                <div className="text-xs opacity-70">Vesting: {i.vesting}</div>
              )}
              {i.kycRequired && (
                <div className="text-xs opacity-70">KYC required</div>
              )}
              {i.limited && (
                <div className="text-xs opacity-70">Limited: {i.limited}</div>
              )}
              {owned && (
                <div className="text-xs">
                  Owned: <b>{i.ownedQty}</b>
                </div>
              )}

              {/* Управление покупкой */}
              {!isWS && (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-xs mb-1">Qty</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="border rounded-md p-2 w-20 text-sm"
                      value={qty[i.id] ?? 1}
                      onChange={(e) =>
                        setQty((q) => ({
                          ...q,
                          [i.id]: Math.max(
                            1,
                            Math.floor(Number(e.target.value) || 1)
                          ),
                        }))
                      }
                    />
                  </div>
                  <button
                    className="rounded-xl border px-3 py-2 text-sm"
                    onClick={() => buy(i.id)}
                  >
                    Buy (mock)
                  </button>
                </div>
              )}

              {/* WS-20: без Qty; кнопка активна только по инвайту */}
              {isWS && (
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
                    onClick={() => buy(i.id)}
                    disabled={owned || !i.invited}
                  >
                    {owned ? 'Owned' : i.invited ? 'Claim (mock)' : 'Invite-only'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
