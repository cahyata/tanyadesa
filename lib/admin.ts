import { adminClient } from "./supabase";

export type UnansweredGroup = {
  question: string;
  count: number;
  lastSeen: string;
};

export type AdminData = {
  servicesInDb: number;
  chunksInDb: number;
  unansweredTotal: number;
  groups: UnansweredGroup[];
  /** true bila baris yang dibaca dibatasi LIMIT sehingga hitungan kelompok bisa kurang */
  truncated: boolean;
};

const ROW_LIMIT = 1000;

const normalize = (q: string) =>
  q
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.\s]+$/g, "")
    .trim();

export async function loadAdminData(): Promise<AdminData> {
  const db = adminClient();

  const [services, chunks, total, rows] = await Promise.all([
    db.from("sop_services").select("*", { count: "exact", head: true }),
    db.from("sop_chunks").select("*", { count: "exact", head: true }),
    db.from("unanswered_questions").select("*", { count: "exact", head: true }),
    db
      .from("unanswered_questions")
      .select("question, created_at")
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT),
  ]);

  const failed = [services, chunks, total, rows].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  const map = new Map<string, UnansweredGroup>();
  for (const r of (rows.data ?? []) as { question: string; created_at: string }[]) {
    const key = normalize(r.question);
    if (!key) continue;
    const g = map.get(key);
    if (g) g.count += 1;
    // baris diurut terbaru dulu, jadi kemunculan pertama = teks dan waktu terbaru
    else map.set(key, { question: r.question.trim(), count: 1, lastSeen: r.created_at });
  }

  const groups = [...map.values()].sort(
    (a, b) => b.count - a.count || (a.lastSeen < b.lastSeen ? 1 : -1),
  );

  return {
    servicesInDb: services.count ?? 0,
    chunksInDb: chunks.count ?? 0,
    unansweredTotal: total.count ?? 0,
    groups,
    truncated: (total.count ?? 0) > ROW_LIMIT,
  };
}
