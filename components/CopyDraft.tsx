"use client";

import { useState } from "react";
import Icon from "./Icon";

/** Kerangka berkas SOP baru (format sama dengan data/sop/*.md), kata kunci diisi dari pertanyaan. */
function draftFor(question: string): string {
  const keywords = question
    .toLowerCase()
    .replace(/[?!.,]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8)
    .join(", ");

  return `---
slug:
name:
category:
keywords: ${keywords}
---

#

Ringkasan satu atau dua kalimat tentang layanan ini.

<!-- Pertanyaan warga yang belum terjawab: "${question.replace(/"/g, "'")}" -->

## Syarat
1.

## Biaya


## Waktu proses


## Langkah
1.

## Catatan

`;
}

export default function CopyDraft({ question }: { question: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="chip"
      aria-label={`Salin kerangka SOP untuk pertanyaan: ${question}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(draftFor(question));
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard tidak tersedia */
        }
      }}
    >
      <Icon name={done ? "check" : "copy"} size={14} />
      {done ? "Tersalin" : "Salin kerangka SOP"}
    </button>
  );
}
