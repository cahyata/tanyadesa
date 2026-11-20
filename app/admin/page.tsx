import type { Metadata } from "next";
import AdminLogin from "@/components/AdminLogin";
import CopyDraft from "@/components/CopyDraft";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { loadAdminData, type AdminData } from "@/lib/admin";
import { allServices } from "@/lib/sop";
import { logout } from "./actions";

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

export default async function Page() {
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
    data = await loadAdminData();
  } catch (e) {
    error = e instanceof Error ? e.message : "Gagal memuat data.";
  }
  const filesCount = allServices().length;

  return (
    <Frame>
      <div className="admin-head">
        <div>
          <p className="tag">Hanya baca</p>
          <h1 className="page__title">Admin</h1>
        </div>
        <form action={logout}>
          <button type="submit" className="chip">
            Keluar
          </button>
        </form>
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

          {filesCount !== data.servicesInDb && (
            <p className="note note--flush">
              Berkas SOP di repo ({filesCount}) berbeda dari layanan di database ({data.servicesInDb}). Jalankan{" "}
              <code>npm run ingest</code> untuk menyinkronkan.
            </p>
          )}

          <section className="panel">
            <h2 className="panel__title">Pertanyaan yang belum terjawab</h2>
            <p className="panel__hint">
              Dikelompokkan dari pertanyaan yang sama, paling sering di atas. Salin kerangka untuk membuat SOP baru di{" "}
              <code>data/sop</code>, lalu jalankan <code>npm run ingest</code>.
              {data.truncated && " Hanya 1.000 catatan terbaru yang dihitung."}
            </p>

            {data.groups.length === 0 ? (
              <p className="admin-empty">Belum ada. Semua pertanyaan sejauh ini terjawab.</p>
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
                    <CopyDraft question={g.question} />
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
