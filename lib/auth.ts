/**
 * Shared-password gate for the dashboard.
 *
 * This is not user accounts. It is one password for a handful of internal
 * staff, which is proportionate for an internal tool — but it is NOT optional,
 * because every page exposes real seller names, emails, phone numbers, deal
 * values and per-employee performance, and a Vercel URL is not a secret.
 *
 * The cookie holds an HMAC of a fixed string keyed by the password, so it
 * cannot be forged without knowing the password, and the password itself is
 * never stored in the browser. Uses Web Crypto because this runs in the Edge
 * runtime, where Node's crypto module is unavailable.
 */

export const AUTH_COOKIE = "rg_auth";

/** Constant string that gets signed. Bump to invalidate every session. */
const TOKEN_PAYLOAD = "rg-dashboard-v1";

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Derives the cookie value for a password. */
export async function deriveToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(TOKEN_PAYLOAD));
  return toBase64Url(signature);
}

/**
 * Length-independent, constant-time comparison. A plain `===` on a secret can
 * leak information through how long the comparison takes.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidToken(token: string | undefined, password: string) {
  if (!token) return false;
  return safeEqual(token, await deriveToken(password));
}
