import type { Metadata } from "next";
import { Suspense } from "react";
import Library from "@/components/Library";
import { allServices, CATEGORIES } from "@/lib/sop";

export const metadata: Metadata = {
  title: "Pustaka layanan",
  description: "Semua layanan administrasi Desa Sukamaju: syarat, biaya, waktu, dan langkah (data fiktif).",
};

export default async function Page() {
  const services = (await allServices()).map((s) => ({
    slug: s.slug,
    name: s.name,
    category: s.category,
    keywords: s.keywords,
    summary: s.summary,
    costShort: s.costShort,
    timeShort: s.timeShort,
  }));

  return (
    <div className="page">
      <div className="wrap wrap--wide">
        <p className="tag">Prototype • Desa Sukamaju</p>
        <h1 className="page__title">Pustaka layanan</h1>
        <p className="lead">
          {services.length} layanan desa. Pilih satu untuk melihat syarat, biaya, waktu, dan langkahnya.
        </p>
        <Suspense fallback={null}>
          <Library services={services} categories={[...CATEGORIES]} />
        </Suspense>
      </div>
    </div>
  );
}
