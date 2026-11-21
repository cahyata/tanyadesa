/**
 * Menyimpan SOP ke Supabase beserta indeks pencariannya (chunk + embedding).
 * Dipakai oleh halaman admin dan skrip `npm run ingest`.
 */
import { embedTexts } from "./gemini";
import { adminClient } from "./supabase";

export type SopInput = {
  slug: string;
  name: string;
  category: string;
  keywords: string;
  /** isi markdown tanpa frontmatter: "# Judul", ringkasan, lalu bagian "## ..." */
  body: string;
};

export type Embedder = (texts: string[]) => Promise<number[][]>;

const defaultEmbed: Embedder = (texts) => embedTexts(texts, "RETRIEVAL_DOCUMENT");

/** Membaca satu berkas data/sop/*.md (frontmatter + isi). */
export function parseSopFile(raw: string, label: string): SopInput {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${label}: frontmatter tidak ditemukan`);
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!meta.slug || !meta.name) throw new Error(`${label}: slug atau name kosong`);
  return {
    slug: meta.slug,
    name: meta.name,
    category: meta.category || "Layanan umum",
    keywords: meta.keywords ?? "",
    body: m[2].trim(),
  };
}

/** Pecah per heading "## ". Bagian pembuka (sebelum "##") ikut jadi chunk pertama. */
export function chunkSop(sop: SopInput): string[] {
  const parts = sop.body.split(/\n(?=## )/).map((p) => p.trim()).filter(Boolean);
  const header = `Layanan: ${sop.name}\nKata kunci: ${sop.keywords}`;
  return parts.map((p) => `${header}\n\n${p}`);
}

/**
 * Menyimpan layanan dan mengganti chunk-nya. Embedding dibuat lebih dulu, jadi bila gagal
 * tidak ada yang berubah. Chunk lama baru dihapus setelah chunk baru berhasil masuk.
 */
export async function saveSop(sop: SopInput, embed: Embedder = defaultEmbed): Promise<{ chunks: number }> {
  const db = adminClient();
  const chunks = chunkSop(sop);
  if (chunks.length === 0) throw new Error("SOP kosong: tidak ada bagian untuk diindeks.");
  const vectors = await embed(chunks);

  const { data: service, error: e1 } = await db
    .from("sop_services")
    .upsert(
      {
        slug: sop.slug,
        name: sop.name,
        category: sop.category,
        keywords: sop.keywords,
        content: sop.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (e1 || !service) {
    if (e1?.code === "23505") throw new Error("Nama layanan itu sudah dipakai layanan lain.");
    throw new Error(`Gagal menyimpan layanan: ${e1?.message}`);
  }

  const { data: old, error: e2 } = await db.from("sop_chunks").select("id").eq("service_id", service.id);
  if (e2) throw new Error(`Gagal membaca indeks lama: ${e2.message}`);

  const { error: e3 } = await db
    .from("sop_chunks")
    .insert(chunks.map((content, i) => ({ service_id: service.id, content, embedding: vectors[i] })));
  if (e3) throw new Error(`Gagal menyimpan indeks: ${e3.message}`);

  const oldIds = (old ?? []).map((r) => r.id as string);
  if (oldIds.length) {
    const { error: e4 } = await db.from("sop_chunks").delete().in("id", oldIds);
    if (e4) throw new Error(`Gagal membersihkan indeks lama: ${e4.message}`);
  }
  return { chunks: chunks.length };
}

export async function deleteSop(slug: string): Promise<void> {
  const db = adminClient();
  const { data: svc, error } = await db.from("sop_services").select("id").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Gagal membaca layanan: ${error.message}`);
  if (!svc) return;
  const { error: e1 } = await db.from("sop_chunks").delete().eq("service_id", svc.id);
  if (e1) throw new Error(`Gagal menghapus indeks: ${e1.message}`);
  const { error: e2 } = await db.from("sop_services").delete().eq("id", svc.id);
  if (e2) throw new Error(`Gagal menghapus layanan: ${e2.message}`);
}
