import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { loadReport, type Report } from "@/lib/admin-report";

export const metadata: Metadata = { title: "Laporan", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");

const OUTCOME = { answered: "Terjawab", clarify: "Pertanyaan balik", refused: "Tidak terjawab" } as const;

export default async function Page() {
  if (!adminEnabled() || !(await isAdmin())) redirect("/admin");

  let r: Report | null = null;
  let error: string | null = null;
  try {
    r = await loadReport();
  } catch (e) {
    error = e instanceof Error ? e.message : "Gagal memuat laporan.";
  }

  return (
    <div className="page">
      <div className="wrap wrap--wide">
        <nav className="crumbs" aria-label="Lokasi">
          <Link href="/admin">Admin</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Laporan</span>
        </nav>
        <h1 className="page__title">Laporan</h1>
        <p className="lead">Pertanyaan warga dan penilaian jawaban dalam {r?.days ?? 30} hari terakhir.</p>

        {error && (
          <p role="alert" className="login__error">
            Laporan tidak dapat dimuat: {error}
          </p>
        )}

        {r && (
          <>
            <div className="stats">
              <div className="tile">
                <p className="tile__label">Pertanyaan</p>
                <p className="tile__value">{r.total}</p>
              </div>
              <div className="tile">
                <p className="tile__label">Terjawab</p>
                <p className="tile__value">
                  {pct(r.answered + r.clarify, r.total)}
                  <span className="stats__sub"> · {r.refused} tidak terjawab</span>
                </p>
              </div>
              <div className="tile">
                <p className="tile__label">Jawaban dinilai membantu</p>
                <p className="tile__value">
                  {pct(r.up, r.up + r.down)}
                  <span className="stats__sub">
                    {" "}
                    · {r.up} ya, {r.down} kurang tepat
                  </span>
                </p>
              </div>
            </div>
            {r.truncated && <p className="note note--flush">Hanya 5.000 catatan terbaru yang dihitung.</p>}

            <section className="panel">
              <h2 className="panel__title">Jawaban yang dinilai kurang tepat</h2>
              <p className="panel__hint">Periksa SOP-nya: sering kali ada syarat yang kurang jelas atau kata kunci yang belum ada.</p>
              {r.badRated.length === 0 ? (
                <p className="admin-empty">Belum ada penilaian kurang tepat.</p>
              ) : (
                <ol className="qlist">
                  {r.badRated.map((x) => (
                    <li key={x.id} className="qrow qrow--sop">
                      <div className="qrow__main">
                        <p className="qrow__text">{x.question}</p>
                        <p className="qrow__meta">
                          {x.service ?? "Tanpa layanan"} · {when.format(new Date(x.created_at))}
                        </p>
                        {x.answer && (
                          <details className="qrow__answer">
                            <summary>Lihat jawaban</summary>
                            <pre>{x.answer}</pre>
                          </details>
                        )}
                      </div>
                      {x.slug && (
                        <Link href={`/admin/sop/edit/${x.slug}`} className="chip">
                          Edit SOP
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className="twocol">
              <section className="panel">
                <h2 className="panel__title">Layanan paling sering ditanya</h2>
                {r.topServices.length === 0 ? (
                  <p className="admin-empty">Belum ada data.</p>
                ) : (
                  <ol className="qlist">
                    {r.topServices.map((s) => (
                      <li key={s.name} className="qrow qrow--sop">
                        <div className="qrow__main">
                          <p className="qrow__text">
                            {s.slug ? <Link href={`/admin/sop/edit/${s.slug}`}>{s.name}</Link> : s.name}
                          </p>
                          <p className="qrow__meta">
                            {s.count}×{s.down > 0 ? ` · ${s.down} dinilai kurang tepat` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="panel">
                <h2 className="panel__title">Pertanyaan paling sering</h2>
                {r.topQuestions.length === 0 ? (
                  <p className="admin-empty">Belum ada data.</p>
                ) : (
                  <ol className="qlist">
                    {r.topQuestions.map((q) => (
                      <li key={q.question} className="qrow qrow--sop">
                        <div className="qrow__main">
                          <p className="qrow__text">{q.question}</p>
                          <p className="qrow__meta">{q.count}×</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <section className="panel">
              <h2 className="panel__title">Pertanyaan terbaru</h2>
              {r.recent.length === 0 ? (
                <p className="admin-empty">Belum ada pertanyaan tercatat.</p>
              ) : (
                <ol className="qlist">
                  {r.recent.map((x) => (
                    <li key={x.id} className="qrow qrow--sop">
                      <div className="qrow__main">
                        <p className="qrow__text">{x.question}</p>
                        <p className="qrow__meta">
                          {OUTCOME[x.outcome]}
                          {x.service ? ` · ${x.service}` : ""} · {when.format(new Date(x.created_at))}
                          {x.rating === 1 ? " · dinilai membantu" : x.rating === -1 ? " · dinilai kurang tepat" : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
