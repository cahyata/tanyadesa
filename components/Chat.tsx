"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Block } from "@/lib/sop";
import { Blocks, inline } from "./Blocks";
import Icon from "./Icon";

type Msg = {
  role: "user" | "bot";
  text: string;
  sources?: string[];
  /** pilihan layanan bila pertanyaan terlalu umum */
  options?: string[];
  answered?: boolean;
  error?: boolean;
  /** jawaban masih ditulis; teks bertambah sedikit demi sedikit */
  streaming?: boolean;
  /** id catatan di server, untuk mengirim penilaian */
  logId?: string;
  /** penilaian warga: 1 membantu, -1 kurang tepat */
  rating?: 1 | -1;
};

const SUGGESTIONS = [
  { label: "Syarat bikin KTP baru", hint: "Dokumen, biaya, dan lama proses" },
  { label: "Anak saya baru lahir, ngurus apa dulu?", hint: "Akta kelahiran dan perubahan KK" },
  { label: "Butuh surat buat ke bank", hint: "Surat usaha, domisili, atau penghasilan" },
  { label: "Kantor desa buka jam berapa?", hint: "Hari dan jam pelayanan" },
] as const;

type Row = { label?: string; blocks: Block[] };

const LABEL_ONLY = /^(?:\*\*)?([^*:]{2,40}):(?:\*\*)?$/;
const LABEL_INLINE =
  /^(?:\*\*)?(Syarat|Biaya|Waktu proses|Waktu|Langkah singkat|Langkah|Catatan|Masa berlaku|Jam layanan)(?::\*\*|\*\*:|:)\s*(.+)$/i;

/** Memecah teks jawaban menjadi baris berlabel (Syarat, Biaya, Waktu proses, Langkah). */
function toRows(text: string): Row[] {
  const rows: Row[] = [];
  let row: Row = { blocks: [] };

  const push = () => {
    if (row.label || row.blocks.length) rows.push(row);
    row = { blocks: [] };
  };
  const last = () => row.blocks[row.blocks.length - 1];

  for (const raw of text.split("\n")) {
    const t = raw.trim();
    if (!t) continue;

    const inlineLabel = t.match(LABEL_INLINE);
    if (inlineLabel) {
      push();
      row = { label: inlineLabel[1], blocks: [{ kind: "p", text: inlineLabel[2] }] };
      continue;
    }
    const only = t.match(LABEL_ONLY);
    if (only) {
      push();
      row = { label: only[1].trim(), blocks: [] };
      continue;
    }

    const ol = t.match(/^\d+[.)]\s+(.*)/);
    const ul = t.match(/^[*\-•]\s+(.*)/);
    if (ol || ul) {
      const kind = ol ? "ol" : "ul";
      const item = (ol ?? ul)![1];
      const tail = last();
      if (tail && tail.kind === kind) tail.items.push(item);
      else row.blocks.push({ kind, items: [item] });
      continue;
    }

    // paragraf penutup setelah daftar menjadi baris tersendiri tanpa label
    if (row.label && row.blocks.some((b) => b.kind !== "p")) push();
    row.blocks.push({ kind: "p", text: t });
  }
  push();
  return rows;
}

const isTile = (r: Row) =>
  !!r.label && /^(biaya|waktu)/i.test(r.label) && r.blocks.length === 1 && r.blocks[0].kind === "p";

const norm = (s: string) => s.replace(/\*\*/g, "").replace(/[:.\s]+$/g, "").trim().toLowerCase();

/** title: nama layanan di header kartu; baris pembuka yang hanya mengulang nama itu dibuang. */
function Sheet({ text, title }: { text: string; title?: string }) {
  let rows = toRows(text);
  const head = rows[0];
  if (title && head && !head.label && head.blocks.length === 1 && head.blocks[0].kind === "p") {
    const a = norm(head.blocks[0].text);
    const b = norm(title);
    if (a.length < 90 && (a.includes(b) || b.includes(a))) rows = rows.slice(1);
  }
  const out: ReactNode[] = [];
  for (let i = 0; i < rows.length; ) {
    if (isTile(rows[i])) {
      const start = i;
      const group: Row[] = [];
      while (i < rows.length && isTile(rows[i])) group.push(rows[i++]);
      out.push(
        <div key={`t${start}`} className="tiles">
          {group.map((g, k) => (
            <div key={k} className="tile">
              <p className="tile__label">{g.label}</p>
              <p className="tile__value">{inline((g.blocks[0] as { text: string }).text)}</p>
            </div>
          ))}
        </div>,
      );
      continue;
    }
    const row = rows[i];
    out.push(
      <div key={`r${i}`} className={row.label ? "sheet__row" : "sheet__row sheet__row--plain"}>
        {row.label && <p className="sheet__label">{row.label}</p>}
        <div className="sheet__body">
          <Blocks blocks={row.blocks} variant={row.label && /^syarat/i.test(row.label) ? "check" : undefined} />
        </div>
      </div>,
    );
    i++;
  }
  return <div className="sheet">{out}</div>;
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard tidak tersedia */
        }
      }}
      className="chip"
      aria-label="Salin jawaban"
    >
      <Icon name={done ? "check" : "copy"} size={14} />
      {done ? "Tersalin" : "Salin"}
    </button>
  );
}

function ShareButton({ text }: { text: string }) {
  const plain = text.replace(/\*\*/g, "");
  const href = `https://wa.me/?text=${encodeURIComponent(`${plain}\n\nDari TanyaDesa (prototype)`)}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="chip" aria-label="Bagikan lewat WhatsApp">
      <Icon name="share" size={14} />
      Bagikan
    </a>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const autoSent = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reduce ? "auto" : "smooth";
    const last = messages[messages.length - 1];
    if (!loading && last?.role === "bot") {
      // jawaban panjang: tampilkan dari awal kartu, bukan dari dasarnya
      const cards = document.querySelectorAll<HTMLElement>(".stream .card");
      cards[cards.length - 1]?.scrollIntoView({ behavior, block: "start" });
      return;
    }
    endRef.current?.scrollIntoView({ behavior: last?.streaming ? "auto" : behavior, block: "end" });
  }, [messages, loading]);

  // Pertanyaan dari tombol "Tanya soal layanan ini" di pustaka (/?q=...)
  useEffect(() => {
    if (autoSent.current) return;
    autoSent.current = true;
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    window.history.replaceState(null, "", window.location.pathname);
    void send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Mengirim penilaian jempol. Tampil langsung; dikembalikan bila gagal terkirim. */
  async function rate(index: number, value: 1 | -1) {
    const msg = messages[index];
    if (!msg?.logId) return;
    const before = msg.rating;
    const next = before === value ? undefined : value;
    setMessages((m) => m.map((x, i) => (i === index ? { ...x, rating: next } : x)));
    if (next === undefined) return; // dibatalkan di layar saja; penilaian terakhir tetap tersimpan
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.logId, rating: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setMessages((m) => m.map((x, i) => (i === index ? { ...x, rating: before } : x)));
    }
  }

  async function send(raw: string) {
    const question = raw.trim().slice(0, 500);
    if (!question || loading) return;

    const previous = [...messages].reverse().find((m) => m.role === "user")?.text;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, previous }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Terjadi gangguan.");
      }

      // Balasan berupa baris JSON: potongan teks ("delta"), lalu hasil akhir ("done") atau "error"
      let partial = "";
      let finished = false;
      const apply = (ev: { t: string; [k: string]: unknown }) => {
        if (ev.t === "delta") {
          partial += String(ev.text ?? "");
          setMessages((m) => {
            const last = m[m.length - 1];
            return last?.streaming
              ? [...m.slice(0, -1), { ...last, text: partial }]
              : [...m, { role: "bot", text: partial, streaming: true }];
          });
        } else if (ev.t === "done") {
          finished = true;
          const final: Msg = {
            role: "bot",
            text: String(ev.answer ?? partial),
            answered: Boolean(ev.answered),
            logId: typeof ev.logId === "string" ? ev.logId : undefined,
            sources: ((ev.sources as { service: string }[]) ?? []).map((s) => s.service),
            options: Array.isArray((ev.clarify as { options?: string[] })?.options)
              ? (ev.clarify as { options: string[] }).options
              : undefined,
          };
          setMessages((m) => (m[m.length - 1]?.streaming ? [...m.slice(0, -1), final] : [...m, final]));
        } else if (ev.t === "error") {
          throw new Error(String(ev.error ?? "Terjadi gangguan."));
        }
      };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) apply(JSON.parse(line));
      }
      if (buf.trim()) apply(JSON.parse(buf));
      if (!finished) throw new Error("Koneksi terputus sebelum jawaban selesai. Silakan coba lagi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi gangguan. Silakan coba lagi.";
      // buang jawaban setengah jadi, ganti dengan pesan galat
      setMessages((m) => [...(m[m.length - 1]?.streaming ? m.slice(0, -1) : m), { role: "bot", text: msg, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat">
      <div className="chat__top">
        <span className="tag">Prototype • Desa Sukamaju</span>
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setInput("");
            fieldRef.current?.focus();
          }}
          disabled={messages.length === 0 || loading}
          className="chip"
        >
          <Icon name="plus" size={14} />
          Percakapan baru
        </button>
      </div>

      <div className="log" role="log" aria-live="polite" aria-busy={loading} aria-label="Percakapan">
        <div className="wrap stream">
          {messages.length === 0 && (
            <section className="msg welcome">
              <div>
                <h1>Mau ngurus apa hari ini?</h1>
                <p className="lead">
                  Tanya syarat surat dan layanan desa dengan bahasa sehari-hari. Tidak perlu tahu nama resminya.
                </p>
              </div>
              <ul className="index">
                {SUGGESTIONS.map((s) => (
                  <li key={s.label}>
                    <button type="button" onClick={() => send(s.label)} disabled={loading}>
                      <span className="index__text">
                        <span className="index__title">{s.label}</span>
                        <span className="index__hint">{s.hint}</span>
                      </span>
                      <Icon name="arrowRight" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="welcome__more">
                Atau <Link href="/layanan">lihat semua layanan</Link> dan baca syaratnya langsung.
              </p>
            </section>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="msg turn--user">
                <div className="ask">{m.text}</div>
              </div>
            ) : m.options ? (
              <section key={i} className="msg clarify" aria-label="Pertanyaan lanjutan">
                <p className="clarify__q">{m.text}</p>
                <div className="options" role="group" aria-label="Pilih layanan yang dimaksud">
                  {m.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className="option"
                      onClick={() => send(o)}
                      disabled={loading || i !== messages.length - 1}
                    >
                      <span>{o}</span>
                      <Icon name="arrowRight" size={16} />
                    </button>
                  ))}
                </div>
              </section>
            ) : m.error ? (
              <div key={i} className="msg card card--error">
                <p className="card__error">{m.text}</p>
              </div>
            ) : (
              <article key={i} className="msg card">
                {m.answered && m.sources && m.sources.length > 0 && (
                  <div className="card__head">
                    <Icon name="book" size={16} />
                    <span>{m.sources[0]}</span>
                  </div>
                )}
                <Sheet text={m.text} title={m.answered ? m.sources?.[0] : undefined} />
                {m.streaming && (
                  <span className="typing" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
                {m.answered === false && (
                  <p className="note">
                    <Icon name="info" size={16} />
                    <span>
                      Kantor Desa Sukamaju buka Senin sampai Kamis pukul <span className="num">08.00</span> sampai{" "}
                      <span className="num">15.00</span>, Jumat pukul <span className="num">08.00</span> sampai{" "}
                      <span className="num">11.30</span> WIB.
                    </span>
                  </p>
                )}
                {m.answered && (
                  <div className="card__foot">
                    <p className="card__sources">
                      <span>Sumber</span>
                      {(m.sources ?? []).map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </p>
                    <div className="card__actions">
                      <ShareButton text={m.text} />
                      <CopyButton text={m.text} />
                    </div>
                  </div>
                )}
                {m.answered && m.logId && (
                  <div className="rating" role="group" aria-label="Penilaian jawaban">
                    <span className="rating__q">{m.rating ? "Terima kasih atas penilaiannya." : "Jawaban ini membantu?"}</span>
                    <button
                      type="button"
                      className="chip"
                      aria-pressed={m.rating === 1}
                      aria-label="Membantu"
                      onClick={() => rate(i, 1)}
                    >
                      <Icon name="thumbUp" size={14} />
                      Ya
                    </button>
                    <button
                      type="button"
                      className="chip"
                      aria-pressed={m.rating === -1}
                      aria-label="Kurang tepat"
                      onClick={() => rate(i, -1)}
                    >
                      <Icon name="thumbDown" size={14} />
                      Kurang tepat
                    </button>
                  </div>
                )}
              </article>
            ),
          )}

          {loading && !messages[messages.length - 1]?.streaming && (
            <div className="msg card" role="status">
              <div className="card__head">
                <span className="pulse" aria-hidden="true" />
                <span>Sedang mencari informasi…</span>
              </div>
              <div className="sheet">
                {[0, 1, 2].map((n) => (
                  <div key={n} className="sheet__row">
                    <span className="skel" />
                    <div className="sheet__body">
                      <span className="skel" />
                      <span className="skel" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="dock"
      >
        <div className="wrap">
          <div className="composer">
            <div className="field-box">
              <label htmlFor="pertanyaan" className="visually-hidden">
                Pertanyaan Anda
              </label>
              <textarea
                id="pertanyaan"
                ref={fieldRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) return;
                  e.preventDefault();
                  // Enter saat memilih kandidat IME (mis. keyboard Jepang/Cina) bukan kirim
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                  formRef.current?.requestSubmit();
                }}
                maxLength={500}
                placeholder="Tulis pertanyaan Anda…"
                autoComplete="off"
                enterKeyHint="send"
                className="field-input"
              />
            </div>
            <button type="submit" disabled={loading || !input.trim()} className="key key--primary">
              <Icon name="send" size={16} />
              Tanya
            </button>
          </div>
          <p className="disclaimer">
            Prototype dengan data fiktif. Jawaban dihasilkan AI, pastikan ke kantor desa. Pertanyaan dicatat tanpa identitas untuk memperbaiki layanan.
          </p>
        </div>
      </form>
    </div>
  );
}
