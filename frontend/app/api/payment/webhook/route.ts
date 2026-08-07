import { NextRequest, NextResponse } from "next/server";
import { Safepay } from "@sfpy/node-sdk";
import { getSafepayEnvironment } from "@/lib/payment";

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

  const notification = body.data?.notification;

  if (!notification) {
    console.error("Webhook missing body.data.notification. Full body:", JSON.stringify(body));
    return NextResponse.json({ error: "Malformed webhook payload" }, { status: 400 });
  }

  const state: string | undefined = notification.state;
  const orderId: string | undefined = notification.metadata?.order_id;

  if (!orderId || !orderId.startsWith("pxm_")) {
    console.error("Webhook missing or malformed order_id:", JSON.stringify(notification.metadata));
    return NextResponse.json({ error: "Malformed order reference" }, { status: 400 });
  }

  // orderId format: pxm_{userId}_{productId}_{timestamp}
  // productId may itself contain underscores (e.g. "engineering_bundle"),
  // so we can't just index by position naively. Robust parse: part[0] is
  // always "pxm", part[1] is always the userId (a UUID -- never contains
  // underscores), the LAST part is always the timestamp (pure digits).
  // Everything strictly between those, rejoined with "_", is the productId.
  const parts = orderId.split("_");
  if (parts.length < 4) {
    console.error("orderId has unexpected shape, cannot parse productId:", orderId);
    return NextResponse.json({ error: "Malformed order reference" }, { status: 400 });
  }
  const userId = parts[1];
  const productId = parts.slice(2, -1).join("_");

  if (!userId || !productId) {
    console.error("Failed to extract userId/productId from orderId:", orderId);
    return NextResponse.json({ error: "Malformed order reference" }, { status: 400 });
  }

  if (state !== "PAID") {
    return NextResponse.json({ received: true, ignored: true, state });
  }

  const amount = notification.amount ? parseFloat(notification.amount) : null;

  try {
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/api/v1/internal/grant-pro-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": process.env.INTERNAL_SERVICE_SECRET!,
      },
      body: JSON.stringify({
        user_id: userId,
        product_id: productId,
        amount,
        transaction_ref: notification.tracker || orderId,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Backend grant-pro-plan call failed:", res.status, errBody);

      // Distinguish permanent failures (retrying won't help -- e.g. the
      // user_id in this order no longer exists, most likely a stale JWT
      // used at checkout after the underlying account was deleted) from
      // transient ones (network blip, a genuine 5xx from our own backend,
      // worth retrying). Returning 200 for permanent failures tells
      // Safepay "received, don't retry" while the error above still lands
      // in our own logs for visibility -- otherwise Safepay retries a
      // request that can never succeed, indefinitely, flooding the logs.
      const isPermanentFailure = res.status === 400 || res.status === 404;
      if (isPermanentFailure) {
        return NextResponse.json({ received: true, granted: false, reason: errBody }, { status: 200 });
      }

      return NextResponse.json({ error: "Failed to grant plan" }, { status: 500 });
    }
  } catch (err) {
    console.error("Failed to reach backend for plan grant:", err);
    return NextResponse.json({ error: "Internal service unreachable" }, { status: 502 });
  }

  return NextResponse.json({ received: true });
}