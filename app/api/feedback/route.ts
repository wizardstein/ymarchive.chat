// Serverless feedback relay. The browser POSTs a small JSON payload here;
// this route hands it off to Resend so the destination email address never
// leaves the server. The body of the user's archive is never involved.
//
// Required environment variables (configure on Vercel or in .env.local):
//   RESEND_API_KEY       — API key from https://resend.com
//   FEEDBACK_TO_EMAIL    — address that receives the messages
//   FEEDBACK_FROM_EMAIL  — verified sender, e.g. "YM Archive <no-reply@yourdomain>"
//                          For dev you can use "onboarding@resend.dev" (only
//                          delivers to the Resend account owner).
//
// If any are missing, the route returns 500 so the UI can degrade gracefully.

import { NextResponse } from "next/server";

const MAX_BODY_CHARS = 10_000;
const MAX_DIAG_CHARS = 2_000;
const MIN_BODY_CHARS = 5;

const SUBJECT_PREFIX: Record<string, string> = {
  bug: "[Bug]",
  feature: "[Feature]",
  feedback: "[Feedback]",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  const toEmail = process.env.FEEDBACK_TO_EMAIL;
  const fromEmail = process.env.FEEDBACK_FROM_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;

  if (!toEmail || !fromEmail || !resendKey) {
    return NextResponse.json(
      { error: "Feedback isn't configured on this deployment yet." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { kind: rawKind, body: rawBody, diagnostics: rawDiag } =
    payload as { kind?: unknown; body?: unknown; diagnostics?: unknown };

  const kind =
    typeof rawKind === "string" && SUBJECT_PREFIX[rawKind]
      ? rawKind
      : "feedback";
  const body = typeof rawBody === "string" ? rawBody.slice(0, MAX_BODY_CHARS) : "";
  const diagnostics =
    typeof rawDiag === "string" ? rawDiag.slice(0, MAX_DIAG_CHARS) : "";

  if (body.trim().length < MIN_BODY_CHARS) {
    return NextResponse.json(
      { error: "Please add a bit more detail before sending." },
      { status: 400 },
    );
  }

  // Gmail strips [bracketed] tags when computing thread identity, so if the
  // rest of the subject is the same across messages it collapses them all
  // under one thread title. Append a snippet of the body so every subject
  // is unique AND previews the message in the inbox list.
  const snippet = body
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60)
    .replace(/\s+\S*$/, ""); // don't cut mid-word
  const subject = snippet
    ? `${SUBJECT_PREFIX[kind]} ${snippet}`
    : `${SUBJECT_PREFIX[kind]} YM Archive Viewer`;
  const textBody = diagnostics
    ? `${body}\n\n---\nDiagnostics:\n${diagnostics}`
    : body;
  const htmlBody = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.5;">
  <p style="white-space:pre-wrap;margin:0 0 12px 0;">${escapeHtml(body)}</p>
  ${
    diagnostics
      ? `<hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
         <p style="color:#666;font-size:12px;margin:0 0 6px 0;">Diagnostics:</p>
         <pre style="background:#f7f7f7;padding:10px;border-radius:6px;font-size:11px;white-space:pre-wrap;color:#555;margin:0;">${escapeHtml(diagnostics)}</pre>`
      : ""
  }
</div>`;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        text: textBody,
        html: htmlBody,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("Resend send failed:", resp.status, detail);
      if (resp.status === 429) {
        return NextResponse.json(
          {
            error:
              "The site has hit today's email limit. Please try again tomorrow, or leave a message on Buy Me a Coffee.",
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: "The message couldn't be sent. Try again later." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback route error:", err);
    return NextResponse.json(
      { error: "The message couldn't be sent. Try again later." },
      { status: 502 },
    );
  }
}
