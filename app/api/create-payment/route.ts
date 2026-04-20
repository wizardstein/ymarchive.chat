// Serverless Revolut Merchant API relay. The browser POSTs a donation amount
// here; this route creates a Revolut order server-side (keeping the secret
// key out of the client bundle) and returns the hosted checkout URL to
// redirect to. The body of the user's archive is never involved — this
// endpoint only ever sees a number.
//
// Required environment variable (configure on Vercel or in .env.local):
//   REVOLUT_SECRET_KEY — Production secret key from Revolut Business →
//                        Settings → APIs → Merchant API.
//
// If it's missing, the route returns 503 so the UI can degrade gracefully.

import { NextResponse } from "next/server";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1000;
const CURRENCY = "EUR";
const DEFAULT_DESCRIPTION = "Support ymarchive.chat ☕";
// Revolut caps order descriptions at 1024 chars; keep well under that.
const MAX_MESSAGE_LENGTH = 500;

export async function POST(req: Request) {
  const secret = process.env.REVOLUT_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Donations aren't configured on this deployment yet." },
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

  const { amount: rawAmount, message: rawMessage } = payload as {
    amount?: unknown;
    message?: unknown;
  };
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : typeof rawAmount === "string"
        ? parseFloat(rawAmount)
        : NaN;

  if (
    !Number.isFinite(amount) ||
    amount < MIN_AMOUNT ||
    amount > MAX_AMOUNT
  ) {
    return NextResponse.json(
      { error: `Amount must be between €${MIN_AMOUNT} and €${MAX_AMOUNT}.` },
      { status: 400 },
    );
  }

  const trimmedMessage =
    typeof rawMessage === "string" ? rawMessage.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  const description = trimmedMessage || DEFAULT_DESCRIPTION;

  // Revolut expects the amount in the currency's minor unit (cents for EUR).
  const amountInCents = Math.round(amount * 100);

  // Derive the post-payment redirect from the request origin so previews
  // and local dev work without any Revolut dashboard reconfiguration.
  const origin =
    req.headers.get("origin") || new URL(req.url).origin;
  const redirectUrl = `${origin}/thank-you`;

  try {
    const resp = await fetch("https://merchant.revolut.com/api/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        "Revolut-Api-Version": "2024-09-01",
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: CURRENCY,
        description,
        redirect_url: redirectUrl,
        merchant_order_ext_ref: `donation-${Date.now()}`,
      }),
    });

    const data = (await resp.json().catch(() => null)) as
      | { checkout_url?: string; id?: string }
      | null;

    if (!resp.ok || !data?.checkout_url) {
      console.error("Revolut order creation failed:", resp.status, data);
      return NextResponse.json(
        { error: "Couldn't create the payment order. Please try again later." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      checkoutUrl: data.checkout_url,
      orderId: data.id,
    });
  } catch (err) {
    console.error("Create-payment route error:", err);
    return NextResponse.json(
      { error: "Couldn't reach the payment provider. Please try again later." },
      { status: 502 },
    );
  }
}
