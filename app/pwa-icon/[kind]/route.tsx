import { ImageResponse } from "next/og";

export const dynamic = "force-static";

const GREEN = "#2D5A46";
const CREAM = "#F5F1E6";

// kind: "192" dan "512" = ikon biasa (sudut membulat); "maskable" = penuh satu warna dengan rumah di zona aman
const KINDS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  maskable: { size: 512, maskable: true },
} as const;

export function generateStaticParams() {
  return Object.keys(KINDS).map((kind) => ({ kind }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const cfg = KINDS[kind as keyof typeof KINDS];
  if (!cfg) return new Response("Not found", { status: 404 });
  const { size, maskable } = cfg;

  // Ikon maskable dipotong sistem (lingkaran/squircle); isi harus di dalam 80% tengah.
  const inner = maskable ? size * 0.62 : size * 0.78;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: GREEN,
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <svg width={inner} height={inner} viewBox="0 0 64 64">
          <path d="M32 13 12 30h6v19a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V30h6L32 13Z" fill={CREAM} />
          <path d="M26 51V38a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13H26Z" fill={GREEN} />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
