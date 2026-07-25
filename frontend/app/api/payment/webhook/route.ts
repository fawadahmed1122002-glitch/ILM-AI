import { NextRequest, NextResponse } from "next/server";
import { Safepay } from "@sfpy/node-sdk";
import { PRO_PRICE_PKR, getSafepayEnvironment } from "@/lib/payment";

export async function POST(req: NextRequest) {
  const safepay = new Safepay({
    environment: getSafepayEnvironment(),
    apiKey: process.env.SAFEPAY_PUBLIC_KEY!,
    v1Secret: process.env.SAFEPAY_SECRET_KEY!,
    webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET!,
  });

  let event;
  try {
    // Signature verification -- this is what stops anyone from POSTing a
    // fake "payment succeeded" event directly to this endpoint. Do not
    // remove or bypass this, even temporarily for testing.
    event = await safepay.verify.webhook(req);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // NOTE: exact event shape/status field names NOT confirmed against real
  // Safepay webhook payloads -- verify against sandbox test events before
  // trusting this condition in production.
  if (event.type !== "payment.success" && event.status !== "PAID") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const orderId: string = event.orderId || event.data?.orderId;
  if (!orderId || !orderId.startsWith("pxm_")) {
    console.error("Webhook missing or malformed orderId:", orderId);
    return NextResponse.json({ error: "Malformed order reference" }, { status: 400 });
  }

  // orderId format: pxm_{userId}_{timestamp}
  const parts = orderId.split("_");
  const userId = parts[1];

  try {
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/api/v1/internal/grant-pro-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": process.env.INTERNAL_SERVICE_SECRET!,
      },
      body: JSON.stringify({
        user_id: userId,
        amount: event.amount ?? PRO_PRICE_PKR,
        transaction_ref: event.paymentId || orderId,
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