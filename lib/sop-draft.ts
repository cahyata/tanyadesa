/** Kerangka isi SOP baru (tanpa judul "# ..."; judul dibuat otomatis dari nama layanan). */
export const SKELETON = `Ringkasan satu atau dua kalimat tentang layanan ini.

## Syarat
1.

## Biaya
Gratis.

## Waktu proses
1 hari kerja.

## Langkah
1. Datang ke Loket 1 kantor desa.

## Catatan
`;

/** Isi awal untuk SOP baru; kata kunci diambil dari pertanyaan warga yang belum terjawab. */
export function draftFromQuestion(question: string): { keywords: string; body: string } {
  const keywords = question
    .toLowerCase()
    .replace(/[?!.,]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8)
    .join(", ");
  return { keywords, body: SKELETON };
}

/** Isi yang tersimpan berawal "# Nama"; formulir hanya menampilkan sisanya. */
export function stripTitle(content: string): string {
  return content.replace(/^\s*# .*\r?\n+/, "").trim();
}

export function withTitle(name: string, body: string): string {
  return `# ${name}\n\n${body.trim()}\n`;
}
