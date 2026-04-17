import { ImageResponse } from "next/og";

export const alt =
  "YM Archive Viewer — open your old Yahoo! Messenger archive in your browser";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #6f2da8 0%, #a66ed9 50%, #4b1e73 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "72px 88px",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          position: "relative",
        }}
      >
        {/* soft radial accents */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            right: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
            display: "flex",
          }}
        />

        {/* Top: brand + pill */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "#fff",
                color: "#4b1e73",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 26,
                letterSpacing: -1,
              }}
            >
              YM
            </div>
            <div style={{ display: "flex" }}>YM Archive Viewer</div>
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 18px",
              borderRadius: 9999,
              background: "rgba(255,255,255,0.18)",
              fontSize: 20,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            2003 – 2012 archives supported
          </div>
        </div>

        {/* Middle: headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 960,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: -2,
            }}
          >
            Your 2007 conversations,
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: -2,
              color: "#fde68a",
            }}
          >
            back from the dead.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "rgba(255,255,255,0.88)",
              maxWidth: 920,
              marginTop: 10,
            }}
          >
            Open your old Yahoo! Messenger .dat files in your browser. 100%
            private — your archive never leaves your device.
          </div>
        </div>

        {/* Bottom: trust signals + URL */}
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 28,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            <div style={{ display: "flex" }}>🔒 No upload</div>
            <div style={{ display: "flex" }}>💸 Free</div>
            <div style={{ display: "flex" }}>🗑️ Nothing stored</div>
          </div>
          <div
            style={{
              display: "flex",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            ymarchive.chat
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
