import type { Metadata, Viewport } from "next";
import { MobileBar, Rail } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TanyaDesa", template: "%s · TanyaDesa" },
  description: "Asisten AI dan pustaka layanan administrasi Desa Sukamaju (prototype, data fiktif)",
  applicationName: "TanyaDesa",
  appleWebApp: { capable: true, title: "TanyaDesa", statusBarStyle: "default" },
};

// Warna bilah alamat/status ponsel mengikuti hijau TanyaDesa
export const viewport: Viewport = { themeColor: "#2D5A46" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* terapkan ukuran teks pilihan warga sebelum halaman tampil, agar tidak berkedip */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var s=localStorage.getItem("tanyadesa:text");if(s==="lg"||s==="xl")document.documentElement.dataset.text=s}catch(e){}',
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Red+Hat+Text:wght@400;500&family=Red+Hat+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="shell">
          <Rail />
          <div className="shell__main">
            <MobileBar />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
