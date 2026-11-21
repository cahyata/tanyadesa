/**
 * Mengimpor data/sop/*.md ke Supabase (bahan awal / pemulihan). Sumber utama kini tabel
 * sop_services yang diedit lewat /admin, jadi skrip ini TIDAK menimpa layanan yang sudah ada
 * kecuali dengan --force.
 *
 * Jalankan: npm run ingest            (hanya layanan yang belum ada di database)
 *           npm run ingest -- --force (timpa semua dari berkas)
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { embedTexts } from "../lib/gemini";
import { parseSopFile, saveSop } from "../lib/sop-index";
import { adminClient } from "../lib/supabase";

const SOP_DIR = path.join(process.cwd(), "data", "sop");
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
  const files = readdirSync(SOP_DIR).filter((f) => f.endsWith(".md")).sort();
  console.log(`Ditemukan ${files.length} file SOP${FORCE ? " (--force: semua ditimpa)" : ""}`);

  const { data: existing, error } = await adminClient().from("sop_services").select("slug, sop_chunks(count)");
  if (error) throw new Error(error.message);
  const have = new Map(
    ((existing ?? []) as { slug: string; sop_chunks: { count: number }[] }[]).map((r) => [
      r.slug,
      r.sop_chunks?.[0]?.count ?? 0,
    ]),
  );

  for (const file of files) {
    const sop = parseSopFile(readFileSync(path.join(SOP_DIR, file), "utf8"), file);
    if (!FORCE && (have.get(sop.slug) ?? 0) > 0) {
      console.log(`- ${sop.name} (sudah ada di database, dilewati)`);
      continue;
    }
    const { chunks } = await saveSop(sop, embedWithWait);
    console.log(`✓ ${sop.name} (${chunks} chunk)`);
  }
  console.log("Selesai.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
