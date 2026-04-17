import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// A tiny "YM" monogram on the brand purple. Rendered server-side at build
// time by Next's ImageResponse pipeline — no runtime cost, no external deps.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #6f2da8 0%, #a66ed9 50%, #4b1e73 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: -1,
          fontFamily:
            "Impact, Haettenschweiler, Arial Narrow Bold, system-ui, sans-serif",
        }}
      >
        YM
      </div>
    ),
    { ...size },
  );
}
