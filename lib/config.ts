// lib/config.ts
import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_SOLANA_CLUSTER: z.enum(["devnet","testnet","mainnet"]).default("devnet"),
  NEXT_PUBLIC_CONTRACT_ADDRESS: z.string().min(32).default("JEBshY8kHWUT1PgicBzemrKJ4Gh64ZTQNFnwCLYF81cF"),
  NEXT_PUBLIC_PROGRAM_ID: z.string().min(32).default("2Z8VfenUPpxgHTec3EDtT1tp25KnWN5sicB5zCDxrEnv"),
  NEXT_PUBLIC_ARWEAVE_URI: z.string().url().default("https://arweave.net/ii-tUAV4V1SloIb2fQ0XPB0G1Q2T2YJ8lYYYVCjdxR0"),
  NEXT_PUBLIC_TELEGRAM_URL: z.string().url().default("https://t.me/cryptovigri"),
  NEXT_PUBLIC_X_URL: z.string().url().default("https://x.com/"),
  NEXT_PUBLIC_GITHUB_URL: z.string().url().default("https://github.com/"),
  NEXT_PUBLIC_DEX_URL: z.string().default("#"),
  
});

const cfg = EnvSchema.safeParse({
  NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
  NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  NEXT_PUBLIC_PROGRAM_ID: process.env.NEXT_PUBLIC_PROGRAM_ID,
  NEXT_PUBLIC_ARWEAVE_URI: process.env.NEXT_PUBLIC_ARWEAVE_URI,
  NEXT_PUBLIC_TELEGRAM_URL: process.env.NEXT_PUBLIC_TELEGRAM_URL,
  NEXT_PUBLIC_X_URL: process.env.NEXT_PUBLIC_X_URL,
  NEXT_PUBLIC_GITHUB_URL: process.env.NEXT_PUBLIC_GITHUB_URL,
  NEXT_PUBLIC_DEX_URL: process.env.NEXT_PUBLIC_DEX_URL,
});

if (!cfg.success) {
  // в проде можно залогировать красиво, здесь просто бросаем
  throw new Error("Invalid public env: " + JSON.stringify(cfg.error.format()));
}

export const CONFIG = {
  CLUSTER: cfg.data.NEXT_PUBLIC_SOLANA_CLUSTER,
  CONTRACT_ADDRESS: cfg.data.NEXT_PUBLIC_CONTRACT_ADDRESS,
  PROGRAM_ID: cfg.data.NEXT_PUBLIC_PROGRAM_ID,
  ARWEAVE_URI: cfg.data.NEXT_PUBLIC_ARWEAVE_URI,
  TELEGRAM_URL: cfg.data.NEXT_PUBLIC_TELEGRAM_URL,
  X_URL: cfg.data.NEXT_PUBLIC_X_URL,
  GITHUB_URL: cfg.data.NEXT_PUBLIC_GITHUB_URL,
  DEX_URL: cfg.data.NEXT_PUBLIC_DEX_URL,
} as const;

// утилиты
export const isMainnet = CONFIG.CLUSTER === "mainnet";
export const explorerQS = isMainnet ? "" : `?cluster=${CONFIG.CLUSTER}`;
export const clusterLabel = isMainnet ? "Mainnet" : CONFIG.CLUSTER === "devnet" ? "Devnet" : "Testnet";
