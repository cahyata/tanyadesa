"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, endSession, startSession } from "@/lib/admin-auth";

export type LoginState = { error?: string } | null;

// Pembatas percobaan login per IP, di memori proses. Cukup untuk prototype;
// untuk produksi sungguhan pakai penyimpanan bersama (mis. Redis).
const attempts = new Map<string, { fails: number; resetAt: number }>();
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "lokal";
  const now = Date.now();

  const rec = attempts.get(ip);
  if (rec && rec.resetAt > now && rec.fails >= MAX_FAILS) {
    return { error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
  }

  const password = String(form.get("password") ?? "").slice(0, 200);
  if (!checkPassword(password)) {
    const cur = rec && rec.resetAt > now ? rec : { fails: 0, resetAt: now + WINDOW_MS };
    cur.fails += 1;
    attempts.set(ip, cur);
    await sleep(500);
    return { error: "Kata sandi salah." };
  }

  attempts.delete(ip);
  await startSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin");
}
