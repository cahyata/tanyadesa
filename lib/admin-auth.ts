/**
 * Autentikasi admin sederhana: satu kata sandi di env (ADMIN_PASSWORD).
 * Sesi = cookie httpOnly berisi HMAC yang diturunkan dari kata sandi itu, jadi
 * kata sandi tidak pernah disimpan di cookie, dan mengganti kata sandi otomatis
 * mengeluarkan semua sesi. Bila ADMIN_PASSWORD kosong, admin nonaktif (gagal tertutup).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "td_admin";
const MAX_AGE = 60 * 60 * 8; // 8 jam

export const adminEnabled = () => Boolean(process.env.ADMIN_PASSWORD);

function sessionToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHmac("sha256", pw).update("tanyadesa-admin-session-v1").digest("hex");
}

/** Perbandingan waktu-konstan, tidak bocor panjang kata sandi. */
export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = createHmac("sha256", "cek").update(input).digest();
  const b = createHmac("sha256", "cek").update(pw).digest();
  return timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const expected = sessionToken();
  if (!expected) return false;
  const got = (await cookies()).get(COOKIE)?.value;
  if (!got || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function startSession(): Promise<void> {
  const token = sessionToken();
  if (!token) return;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).set(COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/admin", maxAge: 0 });
}
