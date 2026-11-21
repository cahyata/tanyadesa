"use client";

import { useEffect, useState } from "react";

const KEY = "tanyadesa:text";
const LEVELS = [
  { id: "", name: "Normal" },
  { id: "lg", name: "Besar" },
  { id: "xl", name: "Sangat besar" },
] as const;

/** Tombol ukuran teks (Normal → Besar → Sangat besar). Pilihan disimpan di perangkat; diterapkan lewat html[data-text]. */
export default function TextSize({ variant }: { variant: "rail" | "bar" }) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const cur = document.documentElement.dataset.text ?? "";
    setLevel(Math.max(0, LEVELS.findIndex((l) => l.id === cur)));
  }, []);

  function next() {
    const n = (level + 1) % LEVELS.length;
    setLevel(n);
    const id = LEVELS[n].id;
    if (id) document.documentElement.dataset.text = id;
    else delete document.documentElement.dataset.text;
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {
      /* penyimpanan dinonaktifkan: ukuran berlaku untuk kunjungan ini saja */
    }
  }

  const cur = LEVELS[level];
  return (
    <button
      type="button"
      onClick={next}
      className={variant === "rail" ? "textsize textsize--rail" : "textsize"}
      aria-label={`Ukuran teks: ${cur.name}. Ketuk untuk mengubah.`}
    >
      <span className="textsize__glyph" aria-hidden="true">
        <span>A</span>
        <span>A</span>
      </span>
      {variant === "rail" && <span className="textsize__name">Ukuran teks: {cur.name}</span>}
      <span className="textsize__dots" aria-hidden="true">
        {LEVELS.map((l, i) => (
          <i key={l.name} data-on={i <= level ? "true" : "false"} />
        ))}
      </span>
    </button>
  );
}
