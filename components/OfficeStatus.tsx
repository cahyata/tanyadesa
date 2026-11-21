"use client";

import { useEffect, useState } from "react";
import { officeStatus, type OfficeStatus as Status } from "@/lib/office";

/** Penanda buka/tutup kantor. Dihitung di perangkat (WIB) dan diperbarui tiap menit. */
export default function OfficeStatus() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    const tick = () => setS(officeStatus());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // ruang tetap agar halaman tidak melompat saat status muncul
  if (!s) return <p className="status status--pending" aria-hidden="true">&nbsp;</p>;
  return (
    <p className={s.open ? "status status--open" : "status status--closed"} title="Belum memperhitungkan hari libur nasional">
      <span className="status__dot" aria-hidden="true" />
      <strong>{s.text}</strong>
      {s.detail && <span className="status__detail">{s.detail}</span>}
    </p>
  );
}
