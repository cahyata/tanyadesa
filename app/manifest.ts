import type { MetadataRoute } from "next";

// Manifest PWA: membuat TanyaDesa bisa dipasang di layar utama dan terbuka seperti aplikasi.
// Belum ada service worker, jadi tidak ada cache offline (sengaja: SOP bisa berubah kapan saja).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TanyaDesa: asisten layanan desa",
    short_name: "TanyaDesa",
    description: "Tanya syarat surat dan layanan Desa Sukamaju dengan bahasa sehari-hari (prototype, data fiktif).",
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F5F1E6",
    theme_color: "#2D5A46",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Tanya", short_name: "Tanya", url: "/", description: "Tanya asisten" },
      { name: "Pustaka layanan", short_name: "Pustaka", url: "/layanan", description: "Lihat semua layanan" },
    ],
  };
}
