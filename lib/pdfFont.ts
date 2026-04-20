import type { jsPDF } from "jspdf";

const FONT_URL = "/fonts/Roboto-Regular.ttf";
const FONT_FILE_NAME = "Roboto-Regular.ttf";
const FONT_NAME = "Roboto";

let cached: Promise<string> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

async function loadFontBase64(): Promise<string> {
  if (!cached) {
    cached = (async () => {
      const res = await fetch(FONT_URL);
      if (!res.ok) {
        throw new Error(`Failed to load PDF font (${res.status})`);
      }
      const buf = await res.arrayBuffer();
      return arrayBufferToBase64(buf);
    })().catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}

export async function ensureFontRegistered(doc: jsPDF): Promise<string> {
  const base64 = await loadFontBase64();
  doc.addFileToVFS(FONT_FILE_NAME, base64);
  doc.addFont(FONT_FILE_NAME, FONT_NAME, "normal");
  return FONT_NAME;
}
