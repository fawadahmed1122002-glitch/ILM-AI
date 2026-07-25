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

  const body = await req.json();

  // TEMPORARY DEBUG LOG -- the real shape of body.data is unconfirmed.
  // verify.js only ever hashes body.data as a black box, it never reads
  // fields inside it. This log tells us, once, what a real webhook payload
  // actually contains, so we can extract orderId/status/amount correctly.
  console.log("Safepay webhook raw body:", JSON.stringify(body, null, 2));

  // Convert NextRequest's Fetch-API Headers into the plain lowercase-keyed
  // object shape the SDK's HttpRequest type expects (Node's IncomingHttpHeaders).
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // NOTE: verify.webhook() is SYNCHRONOUS and returns a boolean -- confirmed
  // from source (dist/resources/verify.js). No await, no event object.
  const isValid = safepay.verify.webhook({ body, headers });

  if (!isValid) {
    console.error("Webhook signature verification failed for body:", JSON.stringify(body));
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Signature confirmed valid. Real event data lives in body.data, per
  // verify.js's own signing logic -- exact field names inside .data are
  // still unconfirmed until we see the debug log above from a real webhook.
  const eventData = body.data;

  // PLACEHOLDER field access -- update once the debug log reveals real names.
  const orderId: string | undefined = eventData?.orderId || eventData?.order_id;
  const status: string | undefined = eventData?.status || eventData?.state;

  if (!orderId || !orderId.startsWith("pxm_")) {
    console.error("Webhook missing or malformed orderId. Full eventData:", JSON.stringify(eventData));
    return NextResponse.json({ error: "Malformed order reference" }, { status: 400 });
  }

  // Only proceed for a genuinely successful/completed payment status.
  // Exact success-status string is unconfirmed -- update after debug log.
  const successStatuses = ["PAID", "CAPTURED", "TRACKER_ENDED", "COMPLETED"];
  if (status && !successStatuses.includes(status)) {
    return NextResponse.json({ received: true, ignored: true, status });
  }

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
        amount: eventData?.amount ?? PRO_PRICE_PKR,
        transaction_ref: eventData?.paymentId || eventData?.id || orderId,
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
