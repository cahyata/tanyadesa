/**
 * Membaca data/sop/*.md untuk halaman pustaka layanan.
 * Dipakai di server (build time), jadi tidak butuh database.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type Block = { kind: "p"; text: string } | { kind: "ol" | "ul"; items: string[] };
export type Section = { title: string; blocks: Block[] };

export type Service = {
  slug: string;
  name: string;
  category: string;
  keywords: string[];
  summary: string;
  /** teks lengkap bagian Biaya / Waktu proses, bila ada */
  cost?: string;
  time?: string;
  /** versi pendek untuk kartu */
  costShort?: string;
  timeShort?: string;
  counter?: string;
  sections: Section[];
};

const SOP_DIR = path.join(process.cwd(), "data", "sop");

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  for (const raw of lines) {
    const t = raw.trim().replace(/^>\s?/, "");
    if (!t) continue;
    const ol = t.match(/^\d+[.)]\s+(.*)/);
    const ul = t.match(/^[*\-•]\s+(.*)/);
    if (ol || ul) {
      const kind = ol ? "ol" : "ul";
      const item = (ol ?? ul)![1];
      const tail = blocks[blocks.length - 1];
      if (tail && tail.kind === kind) tail.items.push(item);
      else blocks.push({ kind, items: [item] });
      continue;
    }
    blocks.push({ kind: "p", text: t });
  }
  return blocks;
}

function plain(s: string): string {
  return s.replace(/\*\*/g, "").trim();
}

function firstSentence(s: string): string {
  const m = plain(s).match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : plain(s)).replace(/\.$/, "");
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

function shortCost(text: string): string {
  const t = plain(text);
  if (/sumbangan|dapat dikenakan/i.test(t) && /tidak dipungut/i.test(t)) return "Sesuai kegiatan";
  if (/^Rp\s?0\b/i.test(t)) return /meterai/i.test(t) ? "Rp0 + meterai" : "Rp0";
  const rp = t.match(/Rp\s?[\d.]+/);
  if (rp) return rp[0].replace(/\s/g, "");
  return clip(firstSentence(t), 22);
}

function shortTime(text: string): string {
  const t = plain(text);
  const days = t.match(/(\d+)\s?(?:[–-]\s?(\d+)\s?)?hari kerja/i);
  if (/hari yang sama/i.test(t) && days) return `Maks. ${days[2] ?? days[1]} hari kerja`;
  if (/hari yang sama/i.test(t)) return "Hari yang sama";
  if (days) return days[2] ? `${days[1]}–${days[2]} hari kerja` : `${days[1]} hari kerja`;
  return clip(firstSentence(t), 24);
}

function parse(file: string): Service {
  const raw = readFileSync(path.join(SOP_DIR, file), "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: frontmatter tidak ditemukan`);

  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }

  const lines = m[2].split(/\r?\n/);
  const sections: Section[] = [];
  const intro: string[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of lines) {
    if (line.startsWith("# ")) continue;
    if (line.startsWith("## ")) {
      if (current) sections.push({ title: current.title, blocks: parseBlocks(current.lines) });
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (current) current.lines.push(line);
    else intro.push(line);
  }
  if (current) sections.push({ title: current.title, blocks: parseBlocks(current.lines) });

  const introBlocks = parseBlocks(intro);
  const first = introBlocks.find((b) => b.kind === "p" && !/^Data fiktif/i.test(b.text));
  const summary = first && first.kind === "p" ? plain(first.text) : "";

  const find = (title: RegExp) => sections.find((x) => title.test(x.title));
  // teks lengkap hanya bila bagian itu satu paragraf; bila berupa daftar, tampil sebagai kartu sendiri
  const single = (title: RegExp) => {
    const s = find(title);
    return s && s.blocks.length === 1 && s.blocks[0].kind === "p" ? plain(s.blocks[0].text) : undefined;
  };
  // sumber ringkasan kartu: paragraf pertama, atau butir pertama bila berupa daftar
  const lead = (title: RegExp) => {
    const b = find(title)?.blocks[0];
    return b ? plain(b.kind === "p" ? b.text : b.items[0]) : undefined;
  };
  const cost = single(/^Biaya/i);
  const time = single(/^Waktu/i);
  const costLead = lead(/^Biaya/i);
  const timeLead = lead(/^Waktu/i);
  const stepsText =
    find(/^Langkah/i)
      ?.blocks.map((b) => (b.kind === "p" ? b.text : b.items.join(" ")))
      .join(" ") ?? "";
  const counter =
    meta.slug === "info-desa" ? undefined : (stepsText.match(/Loket\s\d/) ?? m[2].match(/Loket\s\d/))?.[0];

  return {
    slug: meta.slug,
    name: meta.name,
    category: meta.category ?? "Layanan umum",
    keywords: (meta.keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean),
    summary,
    cost,
    time,
    costShort: costLead ? shortCost(costLead) : undefined,
    timeShort: timeLead ? shortTime(timeLead) : undefined,
    counter,
    sections,
  };
}

let cache: Service[] | null = null;

export function allServices(): Service[] {
  if (!cache) {
    cache = readdirSync(SOP_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map(parse);
  }
  return cache;
}

export function getService(slug: string): Service | undefined {
  return allServices().find((s) => s.slug === slug);
}

export const CATEGORIES = [
  "Kependudukan",
  "Surat keterangan",
  "Usaha dan aset",
  "Bantuan dan kesehatan",
  "Layanan umum",
] as const;
