"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import TextSize from "./TextSize";

const CATEGORIES = [
  "Kependudukan",
  "Surat keterangan",
  "Usaha dan aset",
  "Bantuan dan kesehatan",
  "Layanan umum",
];

function useActive() {
  const path = usePathname();
  return { chat: path === "/", library: path.startsWith("/layanan") };
}

/** Rel kiri untuk layar lebar */
export function Rail() {
  const active = useActive();
  return (
    <aside className="rail" aria-label="Navigasi">
      <Link href="/" className="rail__brand">
        <Icon name="home" size={20} />
        TanyaDesa
      </Link>
      <nav className="rail__nav">
        <Link href="/" className="rail__item" aria-current={active.chat ? "page" : undefined}>
          <Icon name="message" size={16} />
          Tanya baru
        </Link>
        <Link href="/layanan" className="rail__item" aria-current={active.library ? "page" : undefined}>
          <Icon name="book" size={16} />
          Pustaka layanan
        </Link>
      </nav>
      <p className="rail__heading">Kategori</p>
      <nav className="rail__nav" aria-label="Kategori layanan">
        {CATEGORIES.map((c) => (
          <Link key={c} href={`/layanan?k=${encodeURIComponent(c)}`} className="rail__item rail__item--sub">
            {c}
          </Link>
        ))}
      </nav>
      <TextSize variant="rail" />
      <p className="rail__foot">Desa Sukamaju (fiktif). Prototype.</p>
    </aside>
  );
}

/** Bilah atas untuk layar sempit */
export function MobileBar() {
  const active = useActive();
  return (
    <header className="mbar">
      <Link href="/" className="rail__brand">
        <Icon name="home" size={20} />
        TanyaDesa
      </Link>
      <nav className="mbar__nav">
        <Link href="/" className="mbar__item" aria-current={active.chat ? "page" : undefined}>
          Tanya
        </Link>
        <Link href="/layanan" className="mbar__item" aria-current={active.library ? "page" : undefined}>
          Pustaka
        </Link>
        <TextSize variant="bar" />
      </nav>
    </header>
  );
}
