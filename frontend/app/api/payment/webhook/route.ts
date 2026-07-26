import { NextRequest, NextResponse } from "next/server";
import { Safepay } from "@sfpy/node-sdk";
import { PRO_PRICE_PKR, getSafepayEnvironment } from "@/lib/payment";

interface PaymentMetadataItem {
  meta_key: string;
  meta_value: string;
}

export async function POST(req: NextRequest) {
  const safepay = new Safepay({
    environment: getSafepayEnvironment(),
    apiKey: process.env.SAFEPAY_PUBLIC_KEY!,
    v1Secret: process.env.SAFEPAY_SECRET_KEY!,
    webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET!,
  });

  const body = await req.json();

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const isValid = safepay.verify.webhook({ body, headers });

  if (!isValid) {
    console.error("Webhook signature verification failed for body:", JSON.stringify(body));
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // CONFIRMED real shape from live sandbox delivery (Jul 26, 2026):
  // flat root object, state: "PAID" on success, order_id buried inside
  // payment_metadata array (not a top-level field).
  const state: string | undefined = body.state;
  const metadata: PaymentMetadataItem[] = body.payment_metadata || [];
  const orderId = metadata.find((m) => m.meta_key === "order_id")?.meta_value;

  if (!orderId || !orderId.startsWith("pxm_")) {
    console.error("Webhook missing or malformed order_id in payment_metadata:", JSON.stringify(metadata));
    return NextResponse.json({ error: "Malformed order reference" }, { status: 400 });
  }

  // Only PAID is confirmed as a real success state so far. Other states
  // (failed/cancelled/pending) are unconfirmed -- treat anything else as
  // "not yet successful" rather than guessing more state names.
  if (state !== "PAID") {
    return NextResponse.json({ received: true, ignored: true, state });
  }

  // orderId format: pxm_{userId}_{timestamp}
  const parts = orderId.split("_");
  const userId = parts[1];

  // amount comes through as a string like "799.00" -- parse to a number
  const amount = body.amount ? parseFloat(body.amount) : PRO_PRICE_PKR;

  try {
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/api/v1/internal/grant-pro-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": process.env.INTERNAL_SERVICE_SECRET!,
      },
      body: JSON.stringify({
        user_id: userId,
        amount,
        transaction_ref: body.token || body.tracker || orderId,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Backend grant-pro-plan call failed:", res.status, errBody);
      return NextResponse.json({ error: "Failed to grant plan" }, { status: 500 });
    }
  } catch (err) {
    console.error("Failed to reach backend for plan grant:", err);
    return NextResponse.json({ error: "Internal service unreachable" }, { status: 502 });
  }

  return NextResponse.json({ received: true });
}
