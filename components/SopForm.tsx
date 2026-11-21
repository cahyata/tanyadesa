"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveSopAction, type SopFormState } from "@/app/admin/sop/actions";
import { buildService } from "@/lib/sop-parse";
import { withTitle } from "@/lib/sop-draft";
import { ServiceBody } from "./ServiceBody";

type Initial = { slug: string; name: string; category: string; keywords: string; body: string };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export default function SopForm({
  mode,
  initial,
  categories,
  from,
}: {
  mode: "new" | "edit";
  initial: Initial;
  categories: string[];
  /** pertanyaan warga asal SOP baru; ikut dikirim agar ditandai selesai setelah disimpan */
  from?: string;
}) {
  const [state, action, pending] = useActionState<SopFormState, FormData>(saveSopAction, null);
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const preview = useMemo(
    () =>
      v.body.trim()
        ? buildService(
            { slug: v.slug || "pratinjau", name: v.name, category: v.category, keywords: v.keywords },
            withTitle(v.name || "Layanan", v.body),
          )
        : null,
    [v],
  );
  // Panah kiri/kanan memindahkan pilihan tab (pola WAI-ARIA tabs; dua tab, jadi bergantian)
  const onTabKey = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === "ArrowLeft" || e.key === "Home" ? "edit" : "preview";
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };
  const missing = ["Syarat", "Biaya", "Waktu", "Langkah"].filter(
    (h) => !new RegExp(`^## ${h}`, "im").test(v.body),
  );
  const set = (k: keyof Initial) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form action={action} className="sopform">
      <input type="hidden" name="mode" value={mode} />
      {from && <input type="hidden" name="from" value={from} />}

      <div className="field">
        <label htmlFor="name" className="login__label">
          Nama layanan
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={200}
          value={v.name}
          onChange={(e) => {
            const name = e.target.value;
            setV((p) => ({ ...p, name, slug: mode === "new" && !slugTouched ? slugify(name) : p.slug }));
          }}
          className="login__input"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="slug" className="login__label">
            Alamat (slug)
          </label>
          <input
            id="slug"
            name="slug"
            required
            maxLength={80}
            value={v.slug}
            readOnly={mode === "edit"}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug")(e);
            }}
            aria-describedby="slug-hint"
            className="login__input"
          />
          <p id="slug-hint" className="field__hint">
            {mode === "edit" ? "Tidak dapat diubah." : "Huruf kecil, angka, tanda hubung. Jadi alamat /layanan/…"}
          </p>
        </div>
        <div className="field">
          <label htmlFor="category" className="login__label">
            Kategori
          </label>
          <select id="category" name="category" value={v.category} onChange={set("category")} className="login__input">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="keywords" className="login__label">
          Kata kunci
        </label>
        <input
          id="keywords"
          name="keywords"
          maxLength={400}
          value={v.keywords}
          onChange={set("keywords")}
          aria-describedby="kw-hint"
          className="login__input"
        />
        <p id="kw-hint" className="field__hint">
          Pisahkan dengan koma. Istilah sehari-hari warga membantu pencarian, misalnya "bikin KTP, e-KTP".
        </p>
      </div>

      <div className="field">
        <div className="sopform__tabs">
          <label htmlFor="body" className="login__label">
            Isi SOP
          </label>
          <div role="tablist" aria-label="Tampilan isi" className="seg" onKeyDown={onTabKey}>
            <button
              type="button"
              role="tab"
              id="tab-edit"
              aria-selected={tab === "edit"}
              aria-controls="panel-edit"
              tabIndex={tab === "edit" ? 0 : -1}
              onClick={() => setTab("edit")}
            >
              Tulis
            </button>
            <button
              type="button"
              role="tab"
              id="tab-preview"
              aria-selected={tab === "preview"}
              aria-controls="panel-preview"
              tabIndex={tab === "preview" ? 0 : -1}
              onClick={() => setTab("preview")}
            >
              Pratinjau
            </button>
          </div>
        </div>
        {/* panel tulis tetap ada di DOM saat pratinjau agar isinya ikut terkirim */}
        <div role="tabpanel" id="panel-edit" aria-labelledby="tab-edit" hidden={tab !== "edit"}>
        <textarea
          id="body"
          name="body"
          rows={22}
          maxLength={20000}
          value={v.body}
          onChange={set("body")}
          aria-describedby="body-hint"
          className="login__input sopform__body"
          spellCheck={false}
        />
        </div>
        {tab === "preview" && (
          <div className="preview" role="tabpanel" id="panel-preview" aria-labelledby="tab-preview" tabIndex={0}>
            <p className="preview__tag">Pratinjau halaman layanan. Belum tersimpan.</p>
            {missing.length > 0 && (
              <p className="note note--flush">
                Bagian yang belum ada: {missing.join(", ")}. Warga biasanya mencari bagian ini.
              </p>
            )}
            <h3 className="page__title">{v.name || "(nama layanan)"}</h3>
            {preview ? <ServiceBody s={preview} /> : <p className="field__hint">Isi masih kosong.</p>}
          </div>
        )}
        <p id="body-hint" className="field__hint">
          Satu atau dua kalimat ringkasan, lalu bagian berjudul <code>## Syarat</code>, <code>## Biaya</code>,{" "}
          <code>## Waktu proses</code>, <code>## Langkah</code>. Daftar bernomor: <code>1. …</code>. Judul utama
          dibuat otomatis.
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="login__error">
          {state.error}
        </p>
      )}
      <div className="sopform__bar">
        <button type="submit" disabled={pending} className="key key--primary">
          {pending ? "Menyimpan dan membuat indeks…" : mode === "new" ? "Simpan layanan" : "Simpan perubahan"}
        </button>
        <Link href="/admin/sop" className="key">
          Batal
        </Link>
      </div>
    </form>
  );
}
