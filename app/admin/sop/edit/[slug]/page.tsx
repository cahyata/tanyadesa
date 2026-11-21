import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SopForm from "@/components/SopForm";
import TryAsk from "@/components/TryAsk";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { CATEGORIES } from "@/lib/sop";
import { stripTitle } from "@/lib/sop-draft";
import { adminClient } from "@/lib/supabase";
import { deleteSopAction } from "../../actions";

export const metadata: Metadata = { title: "Edit SOP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!adminEnabled() || !(await isAdmin())) redirect("/admin");
  const { slug } = await params;
  const { saved } = await searchParams;

  const { data } = await adminClient()
    .from("sop_services")
    .select("slug, name, category, keywords, content")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="page">
      <div className="wrap wrap--wide">
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "SOP", href: "/admin/sop" },
          ]}
          current={{ label: data.slug, href: `/admin/sop/edit/${data.slug}` }}
        />
        <h1 className="page__title">{data.name}</h1>
        {saved && (
          <p className="note note--flush" role="status">
            Tersimpan dan indeks pencarian sudah diperbarui.{" "}
            <Link href={`/layanan/${data.slug}`}>Lihat di pustaka</Link> ·{" "}
            <Link href="/admin/sop">Kembali ke daftar</Link>
          </p>
        )}
        <SopForm
          mode="edit"
          categories={[...CATEGORIES]}
          initial={{
            slug: data.slug,
            name: data.name,
            category: data.category,
            keywords: data.keywords,
            body: stripTitle(data.content),
          }}
        />

        <TryAsk serviceName={data.name} />

        <details className="danger">
          <summary>Hapus layanan ini</summary>
          <form action={deleteSopAction}>
            <input type="hidden" name="slug" value={data.slug} />
            <p>Layanan dan indeks pencariannya dihapus permanen. Warga tidak lagi mendapat jawaban tentang layanan ini.</p>
            <button type="submit" className="key key--danger">
              Hapus permanen
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
