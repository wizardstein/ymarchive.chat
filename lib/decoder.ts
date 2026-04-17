import { isBuzzMessage } from "./emoticons";
import type { YMMessage } from "./types";

const HEADER_SIZE = 16;
const END_MARKER_SIZE = 4;

/**
 * XOR-decrypt a payload using the username as the repeating key.
 */
export function xorDecrypt(payload: Uint8Array, key: string): Uint8Array {
  const keyBytes = new TextEncoder().encode(key);
  if (keyBytes.length === 0) return payload.slice();
  const out = new Uint8Array(payload.length);
  for (let i = 0; i < payload.length; i++) {
    out[i] = payload[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

/**
 * Decode bytes as UTF-8. If replacement characters appear, fall back to latin-1.
 * Older Windows-era YM archives (esp. Romanian / Eastern European) are often latin-1.
 */
function decodeText(bytes: Uint8Array): string {
  try {
    const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (!utf8.includes("\uFFFD")) return utf8;
  } catch {
    // fall through
  }
  try {
    return new TextDecoder("windows-1252", { fatal: false }).decode(bytes);
  } catch {
    // As a last resort, map bytes one-to-one (latin-1).
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }
}

const ANSI_RE = /\x1b\[[^m]*m/g;
const FONT_OPEN_RE = /<font[^>]*>/gi;
const FONT_CLOSE_RE = /<\/font>/gi;
const ANY_TAG_RE = /<[^>]+>/g;
const EMPTY_LINE_RE = /^\s*$\n?/gm;

export function stripFormatting(text: string): string {
  return text
    .replace(ANSI_RE, "")
    .replace(FONT_OPEN_RE, "")
    .replace(FONT_CLOSE_RE, "")
    .replace(ANY_TAG_RE, "")
    .replace(EMPTY_LINE_RE, "")
    .trim();
}

interface RawBlock {
  timestamp: number;
  direction: number;
  payload: Uint8Array;
}

/**
 * Parse a .dat file into raw (still-encrypted) blocks.
 * Format per block: [16-byte header][msgLength bytes][4-byte end marker].
 * Header = 4× little-endian int32: timestamp, field2 (ignored), direction, msgLength.
 */
export function parseBlocks(data: Uint8Array): RawBlock[] {
  const blocks: RawBlock[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  while (offset + HEADER_SIZE <= data.length) {
    const timestamp = view.getInt32(offset, true);
    // field2 at offset+4 is unused
    const direction = view.getInt32(offset + 8, true);
    const msgLength = view.getInt32(offset + 12, true);

    // Defensive guardrail: abort if length is clearly invalid.
    if (
      msgLength < 0 ||
      msgLength > 1_000_000 ||
      offset + HEADER_SIZE + msgLength + END_MARKER_SIZE > data.length
    ) {
      break;
    }

    const payload = data.subarray(
      offset + HEADER_SIZE,
      offset + HEADER_SIZE + msgLength,
    );
    blocks.push({ timestamp, direction, payload });
    offset += HEADER_SIZE + msgLength + END_MARKER_SIZE;
  }

  return blocks;
}

export interface DecodeOptions {
  localUsername: string;
  peerUsername: string;
}

export function decodeDatFile(
  data: Uint8Array,
  opts: DecodeOptions,
): YMMessage[] {
  const blocks = parseBlocks(data);
  const messages: YMMessage[] = [];

  for (const block of blocks) {
    const decrypted = xorDecrypt(block.payload, opts.localUsername);
    const rawText = decodeText(decrypted);
    const cleaned = stripFormatting(rawText);

    if (!cleaned) continue;

    const isLocal = block.direction === 0;
    const buzz = isBuzzMessage(cleaned);

    messages.push({
      timestamp: block.timestamp,
      sender: isLocal ? opts.localUsername : opts.peerUsername,
      text: cleaned,
      isLocal,
      isBuzz: buzz || undefined,
    });
  }

  return messages;
}
