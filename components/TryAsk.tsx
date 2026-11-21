"use client";

import { useActionState } from "react";
import { tryAskAction, type TryResult } from "@/app/admin/sop/actions";

/** Coba tanya seperti warga, terhadap SOP yang sudah tersimpan. Hasilnya tidak tercatat. */
export default function TryAsk({ serviceName }: { serviceName: string }) {
  const [res, action, pending] = useActionState<TryResult, FormData>(tryAskAction, null);

  return (
    <section className="panel tryask" aria-labelledby="tryask-title">
      <h2 id="tryask-title" className="panel__title">
        Coba tanya
      </h2>
      <p className="panel__hint">
        Menjalankan pertanyaan lewat mesin jawaban yang sama dengan warga, memakai SOP yang <strong>sudah
        tersimpan</strong> (perubahan yang belum disimpan tidak ikut). Tidak dicatat sebagai pertanyaan warga.
      </p>
      <form action={action} className="login__row">
        <label htmlFor="try-q" className="visually-hidden">
          Pertanyaan uji
        </label>
        <input
          id="try-q"
          name="question"
          required
          maxLength={500}
          placeholder={`Contoh: syarat ${serviceName.toLowerCase()}`}
          className="login__input"
        />
        <button type="submit" disabled={pending} className="key key--primary">
          {pending ? "Menjawab…" : "Tanya"}
        </button>
      </form>

      <div aria-live="polite">
        {res?.error && (
          <p role="alert" className="login__error">
            {res.error}
          </p>
        )}
        {res?.answer && (
          <div className="tryask__out">
            <p className={res.answered ? "tryask__badge" : "tryask__badge tryask__badge--no"}>
              {res.options ? "Pertanyaan balik" : res.answered ? "Terjawab" : "Tidak terjawab"}
            </p>
            <pre className="tryask__answer">{res.answer}</pre>
            {res.options && (
              <p className="field__hint">Pilihan yang akan ditampilkan: {res.options.join(" · ")}</p>
            )}
            {res.sources && res.sources.length > 0 && (
              <p className="field__hint">Sumber: {res.sources.join(" · ")}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
