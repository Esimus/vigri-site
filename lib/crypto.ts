// lib/crypto.ts
// Prebuilt Argon2 (no native build). Works great with Next.js API routes.
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

export async function hashPassword(pw: string): Promise<string> {
  // Defaults are already Argon2id with sane parameters
  return argonHash(pw);
}

export async function verifyPassword(hash: string, pw: string): Promise<boolean> {
  try {
    return await argonVerify(hash, pw);
  } catch {
    return false;
  }
}
