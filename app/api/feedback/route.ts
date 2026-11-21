import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase";

export const runtime = "nodejs";

// Pembatas sederhana per IP di memori proses (per instance, cukup untuk prototype).
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Menyimpan penilaian jempol (1 = membantu, -1 = kurang tepat). Warga boleh mengganti penilaiannya. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });

  let body: { id?: unknown; rating?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const rating = body.rating === 1 || body.rating === -1 ? body.rating : null;
  if (!UUID.test(id) || rating === null) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from("question_log")
    .update({ rating, rated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("feedback failed:", error.message);
    return NextResponse.json({ error: "Gagal menyimpan penilaian." }, { status: 500 });
  }
  if (!data?.length) return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
