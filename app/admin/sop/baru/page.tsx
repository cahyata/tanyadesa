import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { redirect } from "next/navigation";
import SopForm from "@/components/SopForm";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { CATEGORIES } from "@/lib/sop";
import { draftFromQuestion } from "@/lib/sop-draft";

export const metadata: Metadata = { title: "Layanan baru", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!adminEnabled() || !(await isAdmin())) redirect("/admin");
  const { q } = await searchParams;
  const question = (q ?? "").slice(0, 500);
  const draft = draftFromQuestion(question);
  const categories = [...CATEGORIES];

  return (
    <div className="page">
      <div className="wrap wrap--wide">
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "SOP", href: "/admin/sop" },
          ]}
          current={{ label: "Baru", href: "/admin/sop/baru" }}
        />
        <h1 className="page__title">Layanan baru</h1>
        {question && (
          <p className="note note--flush">
            Dari pertanyaan warga: <strong>{question}</strong>. Pertanyaan ini ditandai selesai setelah SOP disimpan.
          </p>
        )}
        <SopForm
          mode="new"
          from={question || undefined}
          categories={categories}
          initial={{ slug: "", name: "", category: categories[0], keywords: draft.keywords, body: draft.body }}
        />
      </div>
    </div>
  );
}
