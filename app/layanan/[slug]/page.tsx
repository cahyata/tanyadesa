import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ServiceBody } from "@/components/ServiceBody";
import Icon from "@/components/Icon";
import { allServices, getService } from "@/lib/sop";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tanyadesa.vercel.app";

export async function generateStaticParams() {
  return (await allServices()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await getService(slug);
  return s ? { title: s.name, description: s.summary } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getService(slug);
  if (!s) notFound();

  // Informasi umum bukan layanan yang diurus: tanyakan jam, alamat, dan loket
  const ask =
    s.slug === "info-desa"
      ? "Jam buka, alamat, dan loket di kantor desa?"
      : `Saya mau ngurus ${s.name}. Apa syarat dan langkahnya?`;
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
        <ServiceBody s={s} />

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
        <p className="disclaimer">Data fiktif untuk prototype. Pastikan ke kantor desa untuk layanan sebenarnya.</p>
      </div>
    </div>
  );
}
