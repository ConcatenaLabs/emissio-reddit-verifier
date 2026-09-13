// A verification token is the proof a Reddit user carries from the app to
// Emissio: who they are, when the account was created, and which Emissio
// account asked. Reddit authenticates the user for us; the signature stops
// anyone from forging the claim. The Emissio server verifies it with the
// same secret (see its verifications.go).
//
//   ERV1.<base64url(payload JSON)>.<base64url(HMAC-SHA256 over "ERV1." + payload)>
//
// payload: { u: username, c: account created (unix seconds),
//            e: emissio account code, i: issued (unix seconds), x: expires }

import { createHmac, timingSafeEqual } from "node:crypto";

export const TOKEN_PREFIX = "ERV1";
export const TOKEN_TTL_SECONDS = 24 * 3600;
export const CODE_RE = /^[0-9a-f]{10}$/;

export type Payload = { u: string; c: number; e: string; i: number; x: number };

const b64url = (b: Buffer) => b.toString("base64url");

export function sign(secret: string, p: Payload): string {
  const body = b64url(Buffer.from(JSON.stringify(p)));
  const mac = createHmac("sha256", secret).update(`${TOKEN_PREFIX}.${body}`).digest();
  return `${TOKEN_PREFIX}.${body}.${b64url(mac)}`;
}

export function issue(secret: string, username: string, createdAt: Date, code: string, now = new Date()): string {
  const i = Math.floor(now.getTime() / 1000);
  return sign(secret, { u: username, c: Math.floor(createdAt.getTime() / 1000), e: code, i, x: i + TOKEN_TTL_SECONDS });
}

// verify is here so the format is tested end to end; the production
// verifier is the Emissio server.
export function verify(secret: string, token: string, now = new Date()): Payload | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;
  const mac = createHmac("sha256", secret).update(`${TOKEN_PREFIX}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], "base64url");
  if (given.length !== mac.length || !timingSafeEqual(given, mac)) return null;
  const p = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as Payload;
  if (p.x < Math.floor(now.getTime() / 1000)) return null;
  return p;
}
