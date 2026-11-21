import type { Metadata } from "next";
import Link from "next/link";
import AdminLogin from "@/components/AdminLogin";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { loadAdminData, type AdminData } from "@/lib/admin";
import { logout, setIgnoredAction } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
// Bergantung pada cookie sesi dan data langsung dari database
export const dynamic = "force-dynamic";

const when = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <div className="wrap wrap--wide">{children}</div>
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ ignored?: string }> }) {
  const { ignored } = await searchParams;
  const showIgnored = ignored === "1";
  if (!adminEnabled()) {
    return (
      <Frame>
        <h1 className="page__title">Admin</h1>
        <p className="lead">
          Halaman admin belum diaktifkan. Atur variabel lingkungan <code>ADMIN_PASSWORD</code>, lalu muat ulang.
        </p>
      </Frame>
    );
  }

  if (!(await isAdmin())) {
    return (
      <Frame>
        <h1 className="page__title">Masuk admin</h1>
        <p className="lead">Halaman ini hanya untuk pengelola TanyaDesa.</p>
        <AdminLogin />
      </Frame>
    );
  }

  let data: AdminData | null = null;
  let error: string | null = null;
  try {
    data = await loadAdminData(showIgnored);
  } catch (e) {
    error = e instanceof Error ? e.message : "Gagal memuat data.";
  }

  return (
    <Frame>
      <div className="admin-head">
        <div>
          <p className="tag">Pengelola</p>
          <h1 className="page__title">Admin</h1>
        </div>
        <div className="admin-head__actions">
          <Link href="/admin/laporan" className="key">
            Laporan
          </Link>
          <Link href="/admin/sop" className="key key--primary">
            Kelola SOP
          </Link>
          <form action={logout}>
            <button type="submit" className="key">
              Keluar
            </button>
          </form>
        </div>
      </div>

      {error && (
        <p role="alert" className="login__error">
          Data tidak dapat dimuat: {error}
        </p>
      )}

      {data && (
        <>
          <div className="stats">
            <div className="tile">
              <p className="tile__label">Layanan di database</p>
              <p className="tile__value">{data.servicesInDb}</p>
            </div>
            <div className="tile">
              <p className="tile__label">Potongan teks (chunk)</p>
              <p className="tile__value">{data.chunksInDb}</p>
            </div>
            <div className="tile">
              <p className="tile__label">Pertanyaan tak terjawab</p>
              <p className="tile__value">
                {data.unansweredTotal}
                <span className="stats__sub"> · {data.groups.length} berbeda</span>
              </p>
            </div>
          </div>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">{data.showingIgnored ? "Pertanyaan yang diabaikan" : "Pertanyaan yang belum terjawab"}</h2>
              {data.showingIgnored ? (
                <Link href="/admin" className="chip">
                  Kembali ke daftar
                </Link>
              ) : (
                data.ignoredTotal > 0 && (
                  <Link href="/admin?ignored=1" className="chip">
                    Diabaikan ({data.ignoredTotal})
                  </Link>
                )
              )}
            </div>
            <p className="panel__hint">
              {data.showingIgnored
                ? "Pertanyaan ini tidak dihitung di dasbor. Pulihkan bila ternyata perlu ditangani."
                : "Dikelompokkan dari pertanyaan yang sama, paling sering di atas. \"Buat SOP\" membuka formulir yang sudah terisi kata kuncinya; pertanyaan ditandai selesai setelah SOP disimpan. \"Abaikan\" menyembunyikan pertanyaan yang tidak perlu SOP, misalnya iseng atau salah ketik."}
              {data.truncated && " Hanya 1.000 catatan terbaru yang dihitung."}
            </p>

            {data.groups.length === 0 ? (
              <p className="admin-empty">{data.showingIgnored ? "Tidak ada yang diabaikan." : "Belum ada. Semua pertanyaan sejauh ini terjawab."}</p>
            ) : (
              <ol className="qlist">
                {data.groups.slice(0, 100).map((g) => (
                  <li key={g.question} className="qrow">
                    <span className="qrow__count" aria-label={`${g.count} kali`}>
                      {g.count}×
                    </span>
                    <div className="qrow__main">
                      <p className="qrow__text">{g.question}</p>
                      <p className="qrow__meta">Terakhir {when.format(new Date(g.lastSeen))}</p>
                    </div>
                    <div className="qrow__actions">
                      {!data.showingIgnored && (
                        <Link href={`/admin/sop/baru?q=${encodeURIComponent(g.question)}`} className="chip">
                          Buat SOP
                        </Link>
                      )}
                      <form action={setIgnoredAction}>
                        <input type="hidden" name="question" value={g.question} />
                        <input type="hidden" name="ignore" value={data.showingIgnored ? "0" : "1"} />
                        <button type="submit" className="chip chip--quiet">
                          {data.showingIgnored ? "Pulihkan" : "Abaikan"}
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </Frame>
  );
}
