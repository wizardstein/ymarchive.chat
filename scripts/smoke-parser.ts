// Sanity check for lib/zipParser.ts's folder path:
//   - outer folder names other than "Profiles" are accepted (profiles1, ...)
//   - multiple folders with the same username get merged and deduplicated
//   - avatar pictures are resolved from Index.ini
//   - partial-tree uploads (Archive/ only, no username segment) still work
//     via the YYYYMMDD-<username>.dat fallback

import { parseFolderEntries } from "../lib/zipParser";

function enc(s: string) {
  return new TextEncoder().encode(s);
}
function xor(bytes: Uint8Array, key: string) {
  const k = enc(key);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ k[i % k.length];
  return out;
}
function buildBlock({
  timestamp,
  direction,
  message,
  key,
}: {
  timestamp: number;
  direction: number;
  message: string;
  key: string;
}) {
  const plain = enc(message);
  const cipher = xor(plain, key);
  const buf = new Uint8Array(16 + cipher.length + 4);
  const view = new DataView(buf.buffer);
  view.setInt32(0, timestamp, true);
  view.setInt32(4, 0, true);
  view.setInt32(8, direction, true);
  view.setInt32(12, cipher.length, true);
  buf.set(cipher, 16);
  return buf;
}
function fileFromBytes(bytes: Uint8Array, name: string, type = "application/octet-stream") {
  return new File([bytes as unknown as BlobPart], name, { type });
}
function fileFromText(text: string, name: string, type = "text/plain") {
  return new File([text], name, { type });
}
const fail = (reason: string) => {
  console.error("FAIL:", reason);
  process.exit(1);
};

const TINY_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

async function caseA() {
  const user = "testuser";
  const peer = "oldfriend";
  const block1 = buildBlock({ timestamp: 1184682120, direction: 0, message: "hey :)", key: user });
  const block2 = buildBlock({ timestamp: 1184682180, direction: 1, message: "yo!", key: user });
  const dat1 = new Uint8Array(block1.length + block2.length);
  dat1.set(block1, 0);
  dat1.set(block2, block1.length);
  const block3 = buildBlock({ timestamp: 1184682240, direction: 0, message: "are you there", key: user });
  const dat2 = new Uint8Array(block2.length + block3.length);
  dat2.set(block2, 0);
  dat2.set(block3, block2.length);
  const iconIni = "[Icons]\r\nIcon1=C:\\garbage\\path\\photo.png,4,-1\r\n";
  const files = [
    { path: `profiles1/${user}/Archive/Messages/${peer}/20070717-${user}.dat`, file: fileFromBytes(dat1, "20070717-testuser.dat") },
    { path: `profiles2/${user}/Archive/Messages/${peer}/20070717-${user}.dat`, file: fileFromBytes(dat2, "20070717-testuser.dat") },
    { path: `profiles1/${user}/My Icons/Index.ini`, file: fileFromText(iconIni, "Index.ini") },
    { path: `profiles1/${user}/My Icons/photo.png`, file: fileFromBytes(TINY_PNG, "photo.png", "image/png") },
  ];
  const { profiles, fingerprint } = await parseFolderEntries(files);
  if (!fingerprint || fingerprint.length < 16) fail(`fingerprint missing: ${fingerprint}`);
  if (profiles.length !== 1) fail(`A: expected 1 profile, got ${profiles.length}`);
  const p = profiles[0];
  if (p.username !== user) fail(`A: username: ${p.username}`);
  if (p.conversations[0].messages.length !== 3) fail(`A: dedupe: ${p.conversations[0].messages.length}`);
  if (!p.avatarUrl?.startsWith("data:image/png")) fail("A: avatar not resolved");
}

async function caseB() {
  // User picked the Archive/ folder directly. No username segment above
  // Archive. Parser must derive the username from the filename suffix.
  const user = "lavinia_selena";
  const peer = "crystal_princess";
  const block = buildBlock({ timestamp: 1184682120, direction: 0, message: "hey from Archive-only upload", key: user });
  const files = [
    { path: `Archive/Messages/${peer}/20070717-${user}.dat`, file: fileFromBytes(block, `20070717-${user}.dat`) },
    { path: `My Icons/Index.ini`, file: fileFromText("[Icons]\r\nIcon1=C:\\x\\photo.png,4,-1", "Index.ini") },
    { path: `My Icons/photo.png`, file: fileFromBytes(TINY_PNG, "photo.png", "image/png") },
  ];
  const { profiles } = await parseFolderEntries(files);
  if (profiles.length !== 1) fail(`B: expected 1 profile, got ${profiles.length}`);
  const p = profiles[0];
  if (p.username !== user) fail(`B: expected username ${user}, got ${p.username}`);
  if (p.conversations.length !== 1) fail(`B: expected 1 convo`);
  if (p.conversations[0].messages[0].text !== "hey from Archive-only upload") {
    fail(`B: decoded text wrong: ${p.conversations[0].messages[0].text}`);
  }
  if (!p.avatarUrl?.startsWith("data:image/png")) {
    fail("B: fallback avatar should have been attached to sole profile");
  }
}

async function main() {
  await caseA();
  await caseB();
  console.log("OK — parser handles profiles1/profiles2, dedupe, avatar, AND Archive-only fallback");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
