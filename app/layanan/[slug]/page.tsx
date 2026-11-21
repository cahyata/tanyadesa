import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ServiceBody } from "@/components/ServiceBody";
import Icon from "@/components/Icon";
import { allServices, getService } from "@/lib/sop";

const UPDATED = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
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
        <Breadcrumbs
          items={[
            { label: "Pustaka layanan", href: "/layanan", icon: "arrowLeft" },
            { label: s.category, href: `/layanan?k=${encodeURIComponent(s.category)}` },
          ]}
        />

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
        {s.updatedAt && (
          <p className="updated">
            Informasi diperbarui <time dateTime={s.updatedAt}>{UPDATED.format(new Date(s.updatedAt))}</time>
          </p>
        )}
        <p className="disclaimer">Data fiktif untuk prototype. Pastikan ke kantor desa untuk layanan sebenarnya.</p>
      </div>
    </div>
  );
}
