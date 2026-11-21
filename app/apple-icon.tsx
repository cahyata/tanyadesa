import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ikon layar utama iOS: rumah krem di atas hijau, sama dengan app/icon.svg
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#2D5A46" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M32 13 12 30h6v19a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V30h6L32 13Z" fill="#F5F1E6" />
          <path d="M26 51V38a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13H26Z" fill="#2D5A46" />
        </svg>
      </div>
    ),
    size,
  );
}
