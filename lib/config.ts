// lib/config.ts
import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_SOLANA_CLUSTER: z.enum(["devnet", "testnet", "mainnet"]).default("mainnet"),

  // Mainnet RPC by default (you can override via env)
  NEXT_PUBLIC_SOLANA_RPC_URL: z
    .string()
    .url()
    .default("https://solana-rpc.publicnode.com"),

  NEXT_PUBLIC_CONTRACT_ADDRESS: z
    .string()
    .min(32)
    .default("JEBshY8kHWUT1PgicBzemrKJ4Gh64ZTQNFnwCLYF81cF"),

  NEXT_PUBLIC_PROGRAM_ID: z
    .string()
    .min(32)
    .default("2Z8VfenUPpxgHTec3EDtT1tp25KnWN5sicB5zCDxrEnv"),

  NEXT_PUBLIC_ARWEAVE_URI: z
    .string()
    .url()
    .default("https://arweave.net/ii-tUAV4V1SloIb2fQ0XPB0G1Q2T2YJ8lYYYVCjdxR0"),

  NEXT_PUBLIC_TELEGRAM_URL: z.string().url().default("https://t.me/cryptovigri"),
  NEXT_PUBLIC_X_URL: z.string().url().default("https://x.com/"),
  NEXT_PUBLIC_GITHUB_URL: z.string().url().default("https://github.com/Esimus/vigri"),
  NEXT_PUBLIC_DEX_URL: z.string().default("#"),
});

const cfg = EnvSchema.safeParse({
  NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
  NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  NEXT_PUBLIC_PROGRAM_ID: process.env.NEXT_PUBLIC_PROGRAM_ID,
  NEXT_PUBLIC_ARWEAVE_URI: process.env.NEXT_PUBLIC_ARWEAVE_URI,
  NEXT_PUBLIC_TELEGRAM_URL: process.env.NEXT_PUBLIC_TELEGRAM_URL,
  NEXT_PUBLIC_X_URL: process.env.NEXT_PUBLIC_X_URL,
  NEXT_PUBLIC_GITHUB_URL: process.env.NEXT_PUBLIC_GITHUB_URL,
  NEXT_PUBLIC_DEX_URL: process.env.NEXT_PUBLIC_DEX_URL,
});

if (!cfg.success) {
  throw new Error("Invalid public env: " + JSON.stringify(cfg.error.format()));
}

if (process.env.NODE_ENV === "production" && cfg.data.NEXT_PUBLIC_SOLANA_CLUSTER !== "mainnet") {
  throw new Error("Production must run on mainnet (NEXT_PUBLIC_SOLANA_CLUSTER=mainnet).");
}

export const CONFIG = {
  CLUSTER: cfg.data.NEXT_PUBLIC_SOLANA_CLUSTER,
  RPC_URL: cfg.data.NEXT_PUBLIC_SOLANA_RPC_URL,

  CONTRACT_ADDRESS: cfg.data.NEXT_PUBLIC_CONTRACT_ADDRESS,
  PROGRAM_ID: cfg.data.NEXT_PUBLIC_PROGRAM_ID,
  ARWEAVE_URI: cfg.data.NEXT_PUBLIC_ARWEAVE_URI,

  TELEGRAM_URL: cfg.data.NEXT_PUBLIC_TELEGRAM_URL,
  X_URL: cfg.data.NEXT_PUBLIC_X_URL,
  GITHUB_URL: cfg.data.NEXT_PUBLIC_GITHUB_URL,
  DEX_URL: cfg.data.NEXT_PUBLIC_DEX_URL,
} as const;

// Fallbacks (almost never used because RPC_URL has a default above)
const DEFAULT_RPC: Record<(typeof CONFIG)["CLUSTER"], string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  mainnet: "https://solana-rpc.publicnode.com",
};

// Single exported RPC for all Connections
export const SOLANA_RPC_URL = CONFIG.RPC_URL || DEFAULT_RPC[CONFIG.CLUSTER];

// utilities
export const isMainnet = CONFIG.CLUSTER === "mainnet";
export const explorerQS = isMainnet ? "" : `?cluster=${CONFIG.CLUSTER}`;
export const clusterLabel = isMainnet
  ? "Mainnet"
  : CONFIG.CLUSTER === "devnet"
    ? "Devnet"
    : "Testnet";

// ---- Presale shared settings (single source of truth) ----

// UTC ISO start moment for presale (used on NFT cards, etc.)
// 01.01.2026 12:00 Tallinn (UTC+2) = 2026-01-01T10:00:00Z
export const PRESALE_START_ISO = "2026-01-01T10:00:00Z";

// Elapsed milliseconds since presale start (0 before the start)
export function presaleElapsedMs(now = Date.now()): number {
  const start = Date.parse(PRESALE_START_ISO);
  return Math.max(0, now - start);
}

// Helper to split elapsed time into d/h/m/s
export function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { d, h, m, s };
}
