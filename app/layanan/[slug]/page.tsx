import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/Blocks";
import Icon from "@/components/Icon";
import { allServices, getService } from "@/lib/sop";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tanyadesa.vercel.app";

export function generateStaticParams() {
  return allServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getService(slug);
  return s ? { title: s.name, description: s.summary } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) notFound();

  // Biaya dan Waktu yang hanya satu paragraf tampil sebagai petak, bukan kartu
  const isTile = (t: string, blocks: { kind: string }[]) => /^(Biaya|Waktu)/i.test(t) && blocks.length === 1 && blocks[0].kind === "p";
  const sections = s.sections.filter((x) => !isTile(x.title, x.blocks));

  const ask = `Saya mau ngurus ${s.name}. Apa syarat dan langkahnya?`;
  const share = `https://wa.me/?text=${encodeURIComponent(`${s.name} di Desa Sukamaju: ${SITE}/layanan/${s.slug}`)}`;

  return (
    <div className="page">
      <div className="wrap wrap--read">
        <nav className="crumbs" aria-label="Jejak halaman">
          <Link href="/layanan">
            <Icon name="arrowLeft" size={14} />
            Pustaka layanan
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/layanan?k=${encodeURIComponent(s.category)}`}>{s.category}</Link>
        </nav>

        <h1 className="page__title">{s.name}</h1>
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

        <div className="actions">
          <Link href={`/?q=${encodeURIComponent(ask)}`} className="key key--primary">
            <Icon name="message" size={16} />
            Tanya soal layanan ini
          </Link>
          <a href={share} target="_blank" rel="noopener noreferrer" className="key">
            <Icon name="share" size={16} />
            Bagikan
          </a>
        </div>
        <p className="disclaimer">Data fiktif untuk demo portofolio. Pastikan ke kantor desa untuk layanan sebenarnya.</p>
      </div>
    </div>
  );
}
