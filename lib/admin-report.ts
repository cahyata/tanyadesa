import { normalize } from "./admin";
import { adminClient } from "./supabase";

export const REPORT_DAYS = 30;
const ROW_LIMIT = 5000;

export type LogRow = {
  id: string;
  created_at: string;
  question: string;
  answer: string | null;
  outcome: "answered" | "clarify" | "refused";
  service: string | null;
  rating: 1 | -1 | null;
};

export type Report = {
  days: number;
  total: number;
  answered: number;
  clarify: number;
  refused: number;
  up: number;
  down: number;
  topServices: { name: string; slug?: string; count: number; down: number }[];
  topQuestions: { question: string; count: number }[];
  badRated: (LogRow & { slug?: string })[];
  recent: LogRow[];
  /** true bila ada lebih banyak catatan daripada yang dibaca */
  truncated: boolean;
};

export async function loadReport(): Promise<Report> {
  const db = adminClient();
  const since = new Date(Date.now() - REPORT_DAYS * 86_400_000).toISOString();

  const [rows, services] = await Promise.all([
    db
      .from("question_log")
      .select("id, created_at, question, answer, outcome, service, rating", { count: "exact" })
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT),
    db.from("sop_services").select("name, slug"),
  ]);
  if (rows.error) throw new Error(rows.error.message);
  if (services.error) throw new Error(services.error.message);

  const log = (rows.data ?? []) as LogRow[];
  const slugOf = new Map((services.data ?? []).map((s) => [s.name as string, s.slug as string]));

  const perService = new Map<string, { count: number; down: number }>();
  const perQuestion = new Map<string, { question: string; count: number }>();
  let answered = 0;
  let clarify = 0;
  let refused = 0;
  let up = 0;
  let down = 0;

  for (const r of log) {
    if (r.outcome === "answered") answered++;
    else if (r.outcome === "clarify") clarify++;
    else refused++;
    if (r.rating === 1) up++;
    if (r.rating === -1) down++;

    if (r.service) {
      const s = perService.get(r.service) ?? { count: 0, down: 0 };
      s.count++;
      if (r.rating === -1) s.down++;
      perService.set(r.service, s);
    }
    const key = normalize(r.question);
    if (key) {
      const q = perQuestion.get(key);
      if (q) q.count++;
      else perQuestion.set(key, { question: r.question.trim(), count: 1 });
    }
  }

  return {
    days: REPORT_DAYS,
    total: log.length,
    answered,
    clarify,
    refused,
    up,
    down,
    topServices: [...perService]
      .map(([name, v]) => ({ name, slug: slugOf.get(name), ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topQuestions: [...perQuestion.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    badRated: log.filter((r) => r.rating === -1).slice(0, 30).map((r) => ({ ...r, slug: r.service ? slugOf.get(r.service) : undefined })),
    recent: log.slice(0, 30),
    truncated: (rows.count ?? 0) > ROW_LIMIT,
  };
}
