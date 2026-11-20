import { NextResponse } from "next/server";
import { ask } from "@/lib/rag";

export const runtime = "nodejs";

// Pembatas sederhana per IP, tersimpan di memori proses. Cukup untuk prototype;
// di lingkungan serverless tiap instance punya hitungannya sendiri.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak pertanyaan. Coba lagi sebentar lagi." },
      { status: 429 },
    );
  }

  let body: { question?: unknown; previous?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const previous = typeof body.previous === "string" ? body.previous : undefined;
  if (!question) {
    return NextResponse.json({ error: "Pertanyaan kosong." }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "Pertanyaan terlalu panjang (maksimal 500 karakter)." }, { status: 400 });
  }

  try {
    const result = await ask(question, previous);
    return NextResponse.json(result);
  } catch (err) {
    console.error("ask failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Terjadi gangguan pada layanan. Silakan coba lagi sebentar lagi." },
      { status: 500 },
    );
  }
}
