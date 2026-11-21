import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Kelola SOP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

export default async function Page({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  if (!adminEnabled() || !(await isAdmin())) redirect("/admin");
  const { deleted } = await searchParams;

  const { data, error } = await adminClient()
    .from("sop_services")
    .select("slug, name, category, updated_at")
    .order("category")
    .order("name");
  const rows = (data ?? []) as { slug: string; name: string; category: string; updated_at: string }[];

  return (
    <div className="page">
      <div className="wrap wrap--wide">
        <div className="admin-head">
          <div>
            <nav className="crumbs" aria-label="Lokasi">
              <Link href="/admin">Admin</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">SOP</span>
            </nav>
            <h1 className="page__title">Kelola SOP</h1>
          </div>
          <Link href="/admin/sop/baru" className="key key--primary">
            Layanan baru
          </Link>
        </div>

        {deleted && <p className="note note--flush">Layanan dihapus.</p>}
        {error && (
          <p role="alert" className="login__error">
            Data tidak dapat dimuat: {error.message}
          </p>
        )}

        <section className="panel">
          <h2 className="panel__title">{rows.length} layanan</h2>
          <ul className="qlist">
            {rows.map((r) => (
              <li key={r.slug} className="qrow qrow--sop">
                <div className="qrow__main">
                  <p className="qrow__text">
                    <Link href={`/admin/sop/edit/${r.slug}`}>{r.name}</Link>
                  </p>
                  <p className="qrow__meta">
                    {r.category} · diubah {when.format(new Date(r.updated_at))}
                  </p>
                </div>
                <Link href={`/admin/sop/edit/${r.slug}`} className="chip" aria-label={`Edit ${r.name}`}>
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
