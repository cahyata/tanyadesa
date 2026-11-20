/**
 * Mengukur kualitas TanyaDesa dengan eval/questions.json.
 * Hasil: eval/results.json dan eval/RESULTS.md
 *
 * Jalankan: npm run eval
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ask } from "../lib/rag";

type Item =
  | { id: number; type: "answerable"; q: string; service: string; facts: string[] }
  | { id: number; type: "out_of_scope"; q: string }
  | { id: number; type: "ambiguous"; q: string };

type Row = {
  id: number;
  type: Item["type"];
  q: string;
  pass: boolean;
  detail: string;
  answered: boolean;
  sources: string[];
  answer: string;
};

const EVAL_DIR = path.join(process.cwd(), "eval");
const items: Item[] = JSON.parse(readFileSync(path.join(EVAL_DIR, "questions.json"), "utf8"));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function judge(item: Item, res: Awaited<ReturnType<typeof ask>>): { pass: boolean; detail: string } {
  const answer = res.answer.toLowerCase();
  const sources = res.sources.map((s) => s.service);

  if (item.type === "out_of_scope") {
    return res.answered
      ? { pass: false, detail: "seharusnya menolak, tapi menjawab" }
      : { pass: true, detail: "menolak dengan benar" };
  }
  if (item.type === "ambiguous") {
    const clarifies = res.answered && res.answer.includes("?");
    return clarifies
      ? { pass: true, detail: "bertanya klarifikasi" }
      : { pass: false, detail: res.answered ? "menjawab tanpa bertanya balik" : "menolak" };
  }
  const hit = sources.some((s) => s.toLowerCase().includes(item.service.toLowerCase()));
  const fact = item.facts.some((f) => answer.includes(f.toLowerCase()));
  if (!res.answered) return { pass: false, detail: "menolak padahal ada datanya" };
  if (!hit) return { pass: false, detail: `layanan ${item.service} tidak ada di sumber` };
  if (!fact) return { pass: false, detail: `fakta kunci tidak ditemukan (${item.facts.join(" | ")})` };
  return { pass: true, detail: "layanan dan fakta benar" };
}

async function main() {
  const rows: Row[] = [];
  for (const item of items) {
    try {
      const res = await ask(item.q);
      const { pass, detail } = judge(item, res);
      rows.push({
        id: item.id,
        type: item.type,
        q: item.q,
        pass,
        detail,
        answered: res.answered,
        sources: res.sources.map((s) => s.service),
        answer: res.answer,
      });
      console.log(`${pass ? "PASS" : "FAIL"} #${item.id} ${item.q} -> ${detail}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      rows.push({
        id: item.id, type: item.type, q: item.q, pass: false,
        detail: `error: ${msg.slice(0, 120)}`, answered: false, sources: [], answer: "",
      });
      console.log(`ERR  #${item.id} ${item.q} -> ${msg.slice(0, 120)}`);
    }
    await sleep(1500);
  }

  const types: Item["type"][] = ["answerable", "out_of_scope", "ambiguous"];
  const label: Record<Item["type"], string> = {
    answerable: "Pertanyaan biasa (jawaban benar)",
    out_of_scope: "Di luar cakupan (harus menolak)",
    ambiguous: "Ambigu (harus bertanya balik)",
  };
  const lines = [
    "# Hasil evaluasi TanyaDesa",
    "",
    `Tanggal: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "| Kategori | Lulus | Total | Akurasi |",
    "|---|---|---|---|",
  ];
  let passAll = 0;
  for (const t of types) {
    const subset = rows.filter((r) => r.type === t);
    const ok = subset.filter((r) => r.pass).length;
    passAll += ok;
    lines.push(`| ${label[t]} | ${ok} | ${subset.length} | ${((ok / subset.length) * 100).toFixed(0)}% |`);
  }
  lines.push(`| **Total** | **${passAll}** | **${rows.length}** | **${((passAll / rows.length) * 100).toFixed(0)}%** |`);
  const failed = rows.filter((r) => !r.pass);
  if (failed.length) {
    lines.push("", "## Yang gagal", "", "| # | Pertanyaan | Alasan |", "|---|---|---|");
    for (const r of failed) lines.push(`| ${r.id} | ${r.q} | ${r.detail} |`);
  }
  writeFileSync(path.join(EVAL_DIR, "RESULTS.md"), lines.join("\n") + "\n");
  writeFileSync(path.join(EVAL_DIR, "results.json"), JSON.stringify(rows, null, 2));
  console.log("\n" + lines.slice(4, 4 + types.length + 1).join("\n"));
  console.log(`\nTotal ${passAll}/${rows.length}. Detail di eval/RESULTS.md`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
