import type { Metadata } from "next";
import { MobileBar, Rail } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TanyaDesa", template: "%s · TanyaDesa" },
  description: "Asisten AI dan pustaka layanan administrasi Desa Sukamaju (prototype, data fiktif)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
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
