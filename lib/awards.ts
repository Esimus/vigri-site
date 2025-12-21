import fs from 'fs';
import path from 'path';

type RoundMode = 'floor2' | 'none';

export type AwardRules = {
  version: number;
  echo_unit_eur: number;
  purchase: {
    buyer_pct: number;
    inviter_pct: number;
    reserve_income_pct: number;
    min_eur: number;
    round: RoundMode;
  };
  kyc: { bonus: number; once_per_user?: boolean };
  email?: { bonus: number; once_per_user?: boolean };
  first_login?: { bonus: number; once_per_user?: boolean };
  profile?: { bonus: number; once_per_user?: boolean };
  feedback?: { bonus: number; per_day_limit?: number };
  share_link?: { bonus: number; per_day_limit?: number };
  caps?: { buyer_daily_max?: number; inviter_daily_max?: number };
};

let _cached: AwardRules | null = null;

export async function loadAwardRules(): Promise<AwardRules> {
  if (_cached) return _cached;
  const p = process.env.AWARD_RULES_PATH
    ? path.resolve(process.env.AWARD_RULES_PATH)
    : path.resolve(process.cwd(), 'config/award_rules.json');
  const raw = await fs.promises.readFile(p, 'utf8');
  _cached = JSON.parse(raw) as AwardRules;
  return _cached;
}

function roundEcho(v: number, mode: RoundMode): number {
  if (mode === 'floor2') return Math.floor(v * 100) / 100;
  return v;
}

/** Расчёт для покупки (в echo + требуемый резерв в евро). */
export function calcPurchaseEcho(eur: number, rules: AwardRules) {
  const r = rules.purchase;
  if (!Number.isFinite(eur) || eur < r.min_eur) {
    return { buyerEcho: 0, inviterEcho: 0, reserveEuro: 0 };
  }
  const buyer = roundEcho(eur * r.buyer_pct, r.round);
  const inviter = roundEcho(eur * r.inviter_pct, r.round);
  // Требование к резерву в евро: (выданные echo в евро) + 1% от выручки
  const reserveEuro = buyer + inviter + eur * r.reserve_income_pct;
  return { buyerEcho: buyer, inviterEcho: inviter, reserveEuro };
}
