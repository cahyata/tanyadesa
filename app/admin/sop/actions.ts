"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { normalize } from "@/lib/admin";
import { ask } from "@/lib/rag";
import { deleteSop, saveSop } from "@/lib/sop-index";
import { CATEGORIES, SOP_TAG } from "@/lib/sop";
import { withTitle } from "@/lib/sop-draft";
import { adminClient } from "@/lib/supabase";

export type SopFormState = { error?: string } | null;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function text(form: FormData, key: string, max: number): string {
  return String(form.get(key) ?? "").replace(/\r\n/g, "\n").slice(0, max);
}

function refresh() {
  revalidateTag(SOP_TAG);
  revalidatePath("/layanan", "layout");
}

export async function saveSopAction(_prev: SopFormState, form: FormData): Promise<SopFormState> {
  if (!(await isAdmin())) return { error: "Sesi berakhir. Muat ulang halaman dan masuk lagi." };

  const isNew = form.get("mode") === "new";
  const slug = text(form, "slug", 80).trim();
  const name = text(form, "name", 200).trim();
  const category = text(form, "category", 60).trim();
  const keywords = text(form, "keywords", 400).replace(/\s*\n\s*/g, " ").trim();
  const body = text(form, "body", 20000).trim();
  const from = text(form, "from", 500).trim();

  if (!SLUG.test(slug) || slug === "baru") return { error: "Alamat (slug) hanya huruf kecil, angka, dan tanda hubung, dan tidak boleh \"baru\"." };
  if (name.length < 3) return { error: "Nama layanan terlalu pendek." };
  if (!(CATEGORIES as readonly string[]).includes(category)) return { error: "Pilih kategori yang tersedia." };
  if (body.length < 40) return { error: "Isi SOP terlalu pendek." };
  if (!/^## .+/m.test(body)) return { error: 'Isi SOP perlu minimal satu bagian berjudul, misalnya "## Syarat".' };
  if (/^# /m.test(body)) return { error: 'Jangan tulis judul "# ..." di isi; judul dibuat otomatis dari nama layanan.' };

  const db = adminClient();
  const { data: existing, error: e0 } = await db.from("sop_services").select("slug").eq("slug", slug).maybeSingle();
  if (e0) return { error: `Gagal memeriksa layanan: ${e0.message}` };
  if (isNew && existing) return { error: "Alamat (slug) itu sudah dipakai layanan lain." };
  if (!isNew && !existing) return { error: "Layanan tidak ditemukan. Mungkin sudah dihapus." };

  try {
    await saveSop({ slug, name, category, keywords, body: withTitle(name, body) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyimpan.";
    return { error: /429|quota/i.test(msg) ? "Kuota Gemini sedang habis. Coba lagi satu menit lagi. Perubahan belum disimpan." : msg };
  }

  // pertanyaan warga yang melatarbelakangi SOP baru ini dianggap sudah ditangani
  if (isNew && from) {
    const { data: rows } = await db.from("unanswered_questions").select("id, question").limit(1000);
    const key = normalize(from);
    const ids = (rows ?? []).filter((r) => normalize(r.question) === key).map((r) => r.id);
    if (ids.length) await db.from("unanswered_questions").delete().in("id", ids);
  }

  refresh();
  redirect(`/admin/sop/edit/${slug}?saved=1`);
}

export type TryResult = {
  error?: string;
  answer?: string;
  answered?: boolean;
  sources?: string[];
  options?: string[];
} | null;

/** Menjalankan pertanyaan melalui RAG yang sama dengan warga, terhadap SOP yang SUDAH tersimpan. Tidak dicatat. */
export async function tryAskAction(_prev: TryResult, form: FormData): Promise<TryResult> {
  if (!(await isAdmin())) return { error: "Sesi berakhir. Muat ulang halaman dan masuk lagi." };
  const question = text(form, "question", 500).trim();
  if (!question) return { error: "Tulis pertanyaan dulu." };
  try {
    const r = await ask(question, undefined, undefined, { log: false });
    return {
      answer: r.answer,
      answered: r.answered,
      sources: r.sources.map((s) => s.service),
      options: r.clarify?.options,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return { error: /429|quota/i.test(msg) ? "Kuota Gemini sedang habis. Coba lagi satu menit lagi." : "Gagal menjalankan pertanyaan." };
  }
}

export async function deleteSopAction(form: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const slug = text(form, "slug", 80).trim();
  if (SLUG.test(slug)) {
    await deleteSop(slug);
    refresh();
  }
  redirect("/admin/sop?deleted=1");
}
