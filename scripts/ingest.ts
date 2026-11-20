/**
 * Membaca data/sop/*.md, memecah per bagian, membuat embedding, lalu
 * menyimpannya ke Supabase. Aman dijalankan berulang (data diganti per layanan).
 *
 * Jalankan: npm run ingest
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { embedTexts } from "../lib/gemini";
import { adminClient } from "../lib/supabase";

const SOP_DIR = path.join(process.cwd(), "data", "sop");

type Sop = { slug: string; name: string; keywords: string; body: string };

function parse(file: string): Sop {
  const raw = readFileSync(path.join(SOP_DIR, file), "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: frontmatter tidak ditemukan`);
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!meta.slug || !meta.name) throw new Error(`${file}: slug atau name kosong`);
  return { slug: meta.slug, name: meta.name, keywords: meta.keywords ?? "", body: m[2].trim() };
}

/** Pecah per heading "## ". Bagian pembuka (sebelum "##") ikut jadi chunk pertama. */
function chunk(sop: Sop): string[] {
  const parts = sop.body.split(/\n(?=## )/).map((p) => p.trim()).filter(Boolean);
  const header = `Layanan: ${sop.name}\nKata kunci: ${sop.keywords}`;
  return parts.map((p) => `${header}\n\n${p}`);
}

const FORCE = process.argv.includes("--force");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Menunggu dan mencoba lagi bila kuota per menit Gemini habis (HTTP 429). */
async function embedWithWait(chunks: string[]): Promise<number[][]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await embedTexts(chunks, "RETRIEVAL_DOCUMENT");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("429") || attempt >= 5) throw err;
      console.log(`  kuota habis, menunggu 65 detik (percobaan ${attempt})…`);
      await sleep(65_000);
    }
  }
}

async function main() {
  const db = adminClient();
  const files = readdirSync(SOP_DIR).filter((f) => f.endsWith(".md")).sort();
  console.log(`Ditemukan ${files.length} file SOP${FORCE ? " (--force: semua diproses ulang)" : ""}`);

  // Layanan yang isinya belum berubah dan sudah punya chunk dilewati.
  const { data: existing } = await db.from("sop_services").select("id, slug, content, sop_chunks(count)");
  const done = new Map<string, { content: string; chunks: number }>();
  for (const r of (existing ?? []) as { slug: string; content: string; sop_chunks: { count: number }[] }[]) {
    done.set(r.slug, { content: r.content, chunks: r.sop_chunks?.[0]?.count ?? 0 });
  }

  for (const file of files) {
    const sop = parse(file);
    const prev = done.get(sop.slug);
    if (!FORCE && prev && prev.content === sop.body && prev.chunks > 0) {
      console.log(`- ${sop.name} (tidak berubah, dilewati)`);
      continue;
    }
    const chunks = chunk(sop);
    const vectors = await embedWithWait(chunks);

    const { data: service, error: e1 } = await db
      .from("sop_services")
      .upsert(
        { slug: sop.slug, name: sop.name, content: sop.body, updated_at: new Date().toISOString() },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (e1 || !service) throw new Error(`${file}: ${e1?.message}`);

    const { error: e2 } = await db.from("sop_chunks").delete().eq("service_id", service.id);
    if (e2) throw new Error(`${file}: ${e2.message}`);

    const rows = chunks.map((content, i) => ({
      service_id: service.id,
      content,
      embedding: vectors[i],
    }));
    const { error: e3 } = await db.from("sop_chunks").insert(rows);
    if (e3) throw new Error(`${file}: ${e3.message}`);

    console.log(`✓ ${sop.name} (${chunks.length} chunk)`);
  }
  console.log("Selesai.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
