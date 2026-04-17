// Quick runtime sanity check for lib/decoder.ts.
// Builds two synthetic .dat blocks (one sent, one received), XOR-encrypts
// with a username key, then feeds the bytes through decodeDatFile and
// verifies the round-trip.

import { decodeDatFile } from "../lib/decoder";

function strBytes(s: string) {
  return new TextEncoder().encode(s);
}

function xor(bytes: Uint8Array, key: string) {
  const keyBytes = strBytes(key);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

function buildBlock({ timestamp, direction, message, key }: { timestamp: number; direction: number; message: string; key: string }) {
  const plain = strBytes(message);
  const cipher = xor(plain, key);
  const total = 16 + cipher.length + 4;
  const buf = new Uint8Array(total);
  const view = new DataView(buf.buffer);
  view.setInt32(0, timestamp, true);
  view.setInt32(4, 0, true);
  view.setInt32(8, direction, true);
  view.setInt32(12, cipher.length, true);
  buf.set(cipher, 16);
  // 4-byte end marker — contents don't matter, just size.
  view.setInt32(16 + cipher.length, 0, true);
  return buf;
}

const username = "lavinia_selena";
const peer = "crystal_princess_07";

const block1 = buildBlock({
  timestamp: 1184682120, // 2007-07-17 evening
  direction: 0, // sent
  message: "hey you on? :)",
  key: username,
});
const block2 = buildBlock({
  timestamp: 1184682130,
  direction: 1, // received
  message: "<font face=\"Arial\">yeah!\x1b[31m red \x1b[0m</font>",
  key: username,
});

const combined = new Uint8Array(block1.length + block2.length);
combined.set(block1, 0);
combined.set(block2, block1.length);

const msgs = decodeDatFile(combined, {
  localUsername: username,
  peerUsername: peer,
});

const fail = (reason: string) => {
  console.error("FAIL:", reason);
  process.exit(1);
};

if (msgs.length !== 2) fail(`expected 2 messages, got ${msgs.length}`);
if (msgs[0].text !== "hey you on? :)") fail(`msg0 text wrong: ${JSON.stringify(msgs[0].text)}`);
if (!msgs[0].isLocal) fail("msg0 should be local");
if (msgs[0].sender !== username) fail("msg0 sender wrong");
if (msgs[1].isLocal) fail("msg1 should not be local");
if (msgs[1].sender !== peer) fail("msg1 sender wrong");
// After stripping ANSI + <font> tags, the second message should be just "yeah! red"
if (!msgs[1].text.includes("yeah!") || !msgs[1].text.includes("red")) {
  fail(`msg1 text wrong: ${JSON.stringify(msgs[1].text)}`);
}
if (msgs[1].text.includes("\x1b") || msgs[1].text.includes("<font")) {
  fail(`msg1 still has formatting: ${JSON.stringify(msgs[1].text)}`);
}
if (msgs[0].timestamp !== 1184682120) fail("msg0 timestamp wrong");

console.log("OK — decoder round-trip works");
console.log(msgs);
