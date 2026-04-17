import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: -4,
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
