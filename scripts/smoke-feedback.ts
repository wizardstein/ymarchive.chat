// Sanity check for app/api/feedback/route.ts. Resend's HTTP API is stubbed
// (no mail is sent); we assert on the payload the route would send it.
//   - an optional sender email becomes the Reply-To, so "Reply" in the inbox
//     answers the person who wrote in
//   - no email → no reply_to
//   - a malformed email is rejected with 400 instead of being dropped silently

process.env.RESEND_API_KEY = "re_test";
process.env.FEEDBACK_TO_EMAIL = "dev@example.com";
process.env.FEEDBACK_FROM_EMAIL = "onboarding@resend.dev";

import { POST } from "../app/api/feedback/route";

const fail = (reason: string) => {
  console.error("FAIL:", reason);
  process.exit(1);
};

let sent: Record<string, unknown> | null = null;
globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
  sent = JSON.parse(String(init?.body));
  return new Response(JSON.stringify({ id: "test" }), { status: 200 });
}) as typeof fetch;

function post(payload: Record<string, unknown>) {
  sent = null;
  return POST(
    new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

async function main() {
  const body = "My messages show up as junk characters";

  // 1. With an email → reply_to set, and the address is visible in the body.
  let resp = await post({ kind: "bug", body, email: "  maria@example.com " });
  if (resp.status !== 200) fail(`1: expected 200, got ${resp.status}`);
  if (!sent) fail("1: nothing was sent to Resend");
  if (sent!.reply_to !== "maria@example.com") {
    fail(`1: reply_to = ${JSON.stringify(sent!.reply_to)}`);
  }
  if (!String(sent!.text).includes("maria@example.com")) {
    fail("1: email missing from the text body");
  }

  // 2. Without an email → no reply_to.
  resp = await post({ kind: "bug", body });
  if (resp.status !== 200) fail(`2: expected 200, got ${resp.status}`);
  if (sent && "reply_to" in sent!) fail("2: reply_to set without an email");

  // 3. Malformed email → 400, nothing sent.
  resp = await post({ kind: "bug", body, email: "maria at example" });
  if (resp.status !== 400) fail(`3: expected 400, got ${resp.status}`);
  if (sent) fail("3: a message was sent despite the invalid email");

  console.log("OK — feedback relay sets Reply-To from the optional email");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
