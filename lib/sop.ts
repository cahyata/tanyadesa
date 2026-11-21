/**
 * Layanan untuk halaman pustaka, dibaca dari tabel sop_services di Supabase
 * (sumber tunggal; berkas data/sop hanya bahan awal untuk `npm run ingest`).
 */
import { unstable_cache } from "next/cache";
import { buildService } from "./sop-parse";
import { adminClient } from "./supabase";

export type { Block, Section, Service } from "./sop-parse";
import type { Service } from "./sop-parse";

/** Cache data layanan; dibuang oleh revalidateTag(SOP_TAG) setiap kali admin menyimpan atau menghapus SOP. */
export const SOP_TAG = "sop";

const load = unstable_cache(
  async (): Promise<Service[]> => {
    const { data, error } = await adminClient()
      .from("sop_services")
      .select("slug, name, category, keywords, content")
      .order("slug");
    if (error) throw new Error(`Gagal membaca layanan: ${error.message}`);
    return (data ?? []).map((r) =>
      buildService({ slug: r.slug, name: r.name, category: r.category, keywords: r.keywords }, r.content),
    );
  },
  ["sop-services"],
  { tags: [SOP_TAG] },
);

export async function allServices(): Promise<Service[]> {
  return load();
}

export async function getService(slug: string): Promise<Service | undefined> {
  return (await load()).find((s) => s.slug === slug);
}

export const CATEGORIES = [
  "Kependudukan",
  "Surat keterangan",
  "Usaha dan aset",
  "Bantuan dan kesehatan",
  "Layanan umum",
] as const;
