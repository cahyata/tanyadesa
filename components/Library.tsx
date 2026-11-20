"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";

export type ServiceCard = {
  slug: string;
  name: string;
  category: string;
  keywords: string[];
  summary: string;
  costShort?: string;
  timeShort?: string;
};

export default function Library({ services, categories }: { services: ServiceCard[]; categories: string[] }) {
  const params = useSearchParams();
  const requested = params.get("k");
  const cat = requested && categories.includes(requested) ? requested : null;
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const shown = services.filter(
    (s) =>
      (!cat || s.category === cat) &&
      (!needle || [s.name, s.summary, ...s.keywords].join(" ").toLowerCase().includes(needle)),
  );
  const count = (c: string) => services.filter((s) => s.category === c).length;

  return (
    <>
      <div className="search">
        <Icon name="search" size={18} />
        <label htmlFor="cari" className="visually-hidden">
          Cari layanan
        </label>
        <input
          id="cari"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari layanan, misalnya surat usaha"
          autoComplete="off"
        />
      </div>

      <nav className="filters" aria-label="Filter kategori">
        <Link href="/layanan" replace scroll={false} className="filter" aria-current={!cat ? "true" : undefined}>
          Semua {services.length}
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/layanan?k=${encodeURIComponent(c)}`}
            replace
            scroll={false}
            className="filter"
            aria-current={cat === c ? "true" : undefined}
          >
            {c} {count(c)}
          </Link>
        ))}
      </nav>

      <p className="visually-hidden" role="status">
        {shown.length} layanan ditampilkan
      </p>

      {shown.length === 0 ? (
        <div className="empty">
          <p>Tidak ada layanan yang cocok dengan “{q}”.</p>
          <Link href={`/?q=${encodeURIComponent(q)}`} className="key">
            Tanya langsung ke asisten
          </Link>
        </div>
      ) : (
        <ul className="cards">
          {shown.map((s) => (
            <li key={s.slug}>
              <Link href={`/layanan/${s.slug}`} className="scard">
                <span className="scard__cat">{s.category}</span>
                <span className="scard__name">{s.name}</span>
                {s.summary && <span className="scard__sum">{s.summary}</span>}
                {(s.costShort || s.timeShort) && (
                  <span className="scard__meta">
                    {s.costShort && (
                      <span>
                        <Icon name="coin" size={14} />
                        {s.costShort}
                      </span>
                    )}
                    {s.timeShort && (
                      <span>
                        <Icon name="clock" size={14} />
                        {s.timeShort}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
