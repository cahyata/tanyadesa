import { Blocks } from "./Blocks";
import type { Service } from "@/lib/sop-parse";

// Biaya dan Waktu yang hanya satu paragraf tampil sebagai petak, bukan kartu
const isTile = (t: string, blocks: { kind: string }[]) =>
  /^(Biaya|Waktu)/i.test(t) && blocks.length === 1 && blocks[0].kind === "p";

/** Isi halaman layanan (ringkasan, petak biaya/waktu/loket, bagian). Dipakai halaman publik dan pratinjau admin. */
export function ServiceBody({ s }: { s: Service }) {
  const sections = s.sections.filter((x) => !isTile(x.title, x.blocks));
  return (
    <>
      {s.summary && <p className="lead">{s.summary}</p>}

      {(s.cost || s.time || s.counter) && (
        <div className="tiles tiles--three">
          {s.cost && (
            <div className="tile">
              <p className="tile__label">Biaya</p>
              <p className="tile__value">{s.cost}</p>
            </div>
          )}
          {s.time && (
            <div className="tile">
              <p className="tile__label">Waktu proses</p>
              <p className="tile__value">{s.time}</p>
            </div>
          )}
          {s.counter && (
            <div className="tile">
              <p className="tile__label">Loket</p>
              <p className="tile__value">{s.counter}</p>
            </div>
          )}
        </div>
      )}

      {sections.map((x) => (
        <section key={x.title} className="panel">
          <h2 className="panel__title">{x.title}</h2>
          <div className="panel__body">
            <Blocks blocks={x.blocks} variant={/^(Syarat|Hal yang perlu)/i.test(x.title) ? "check" : undefined} />
          </div>
        </section>
      ))}
    </>
  );
}
