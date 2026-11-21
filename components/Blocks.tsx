import { Fragment, type ReactNode } from "react";
import type { Block } from "@/lib/sop-parse";

/** Mengubah **tebal** menjadi <strong>. Tidak merender HTML dari teks. */
export function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>,
  );
}

/** variant "check": daftar syarat sebagai daftar centang. */
export function Blocks({ blocks, variant }: { blocks: Block[]; variant?: "check" }) {
  return (
    <>
      {blocks.map((b, j) =>
        b.kind === "p" ? (
          <p key={j}>{inline(b.text)}</p>
        ) : variant === "check" ? (
          <ul key={j} className="checks">
            {b.items.map((it, k) => (
              <li key={k}>
                <span className="checks__box" aria-hidden="true" />
                <span>{inline(it)}</span>
              </li>
            ))}
          </ul>
        ) : b.kind === "ol" ? (
          <ol key={j} className="steps">
            {b.items.map((it, k) => (
              <li key={k}>
                <span>{inline(it)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <ul key={j} className="bullets">
            {b.items.map((it, k) => (
              <li key={k}>{inline(it)}</li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}
