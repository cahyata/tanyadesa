/**
 * Data kantor desa dan jam layanan. Fiktif untuk prototype: ganti dengan data asli desa.
 * Murni (tanpa server/DOM), jadi aman dipakai di komponen klien.
 */
export const OFFICE = {
  name: "Kantor Desa Sukamaju",
  address: "Jl. Raya Sukamaju No. 1, Kecamatan Suka Makmur",
  phoneLabel: "(0000) 000-0000",
  tel: "+620000000000",
  whatsapp: "620000000000",
} as const;

export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE.address)}`;
export const WHATSAPP_URL = `https://wa.me/${OFFICE.whatsapp}?text=${encodeURIComponent("Halo, saya mau bertanya tentang layanan desa.")}`;
export const TEL_URL = `tel:${OFFICE.tel}`;

type Segment = [start: number, end: number]; // menit sejak 00.00, WIB

// 0 = Minggu ... 6 = Sabtu
const SCHEDULE: Record<number, Segment[]> = {
  0: [],
  1: [[8 * 60, 12 * 60], [13 * 60, 15 * 60]],
  2: [[8 * 60, 12 * 60], [13 * 60, 15 * 60]],
  3: [[8 * 60, 12 * 60], [13 * 60, 15 * 60]],
  4: [[8 * 60, 12 * 60], [13 * 60, 15 * 60]],
  5: [[8 * 60, 11 * 60 + 30]],
  6: [],
};

const DAY = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}.${String(m % 60).padStart(2, "0")}`;

export type OfficeStatus = { open: boolean; text: string; detail: string };

/** Status kantor pada waktu tertentu (zona WIB). Belum memperhitungkan hari libur nasional. */
export function officeStatus(now: Date = new Date()): OfficeStatus {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = WEEKDAY[get("weekday")] ?? 0;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));

  const today = SCHEDULE[day];
  const current = today.find(([s, e]) => minutes >= s && minutes < e);
  if (current) {
    const end = current[1];
    const nextSeg = today.find(([s]) => s >= end);
    return {
      open: true,
      text: "Kantor buka sekarang",
      detail: nextSeg ? `Istirahat pukul ${hhmm(end)}, buka lagi ${hhmm(nextSeg[0])} WIB` : `Tutup pukul ${hhmm(end)} WIB`,
    };
  }

  const later = today.find(([s]) => s > minutes);
  if (later) return { open: false, text: "Kantor sedang tutup", detail: `Buka hari ini pukul ${hhmm(later[0])} WIB` };

  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    const first = SCHEDULE[d][0];
    if (first) {
      const when = i === 1 ? "besok" : DAY[d];
      return { open: false, text: "Kantor sedang tutup", detail: `Buka ${when} pukul ${hhmm(first[0])} WIB` };
    }
  }
  return { open: false, text: "Kantor sedang tutup", detail: "" };
}
