import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "camera_session";
const SESSION_SECONDS = 24 * 60 * 60;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured`);
  return value;
}

function sameValue(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export function credentialsMatch(username: string, password: string): boolean {
  const usernameMatches = sameValue(username, requiredEnv("APP_USERNAME"));
  const passwordMatches = sameValue(password, requiredEnv("APP_PASSWORD"));
  return usernameMatches && passwordMatches;
}

function signature(payload: string): string {
  return createHmac("sha256", requiredEnv("SESSION_SECRET"))
    .update(payload)
    .digest("base64url");
}

export function newSessionCookie(): { value: string; maxAge: number } {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `v1.${expires}`;
  return { value: `${payload}.${signature(payload)}`, maxAge: SESSION_SECONDS };
}

export function validSessionCookie(value: string | undefined): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !/^\d+$/.test(parts[1])) return false;
  const expires = Number(parts[1]);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = signature(`${parts[0]}.${parts[1]}`);
  return sameValue(parts[2], expected);
}

export async function isAuthenticated(): Promise<boolean> {
  return validSessionCookie((await cookies()).get(SESSION_COOKIE)?.value);
}

export function safeNextPath(value: string | null | undefined): "/stream" | "/watch" {
  return value === "/stream" ? "/stream" : "/watch";
}

