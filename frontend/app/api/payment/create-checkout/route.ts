import { NextRequest, NextResponse } from "next/server";
import { Safepay } from "@sfpy/node-sdk";
import { getSafepayEnvironment } from "@/lib/payment";
import { getProduct } from "@/lib/products";
import { api } from "@/lib/api";

interface MeResponse {
  user_id: string;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate via the caller's JWT -- same Bearer-token pattern the
    // client pages use. The backend verifies the signature and returns
    // the trusted user identity; userId is never taken from the body.
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 });
    }

    let userId: string;
    try {
      const me = await api.get<MeResponse>("/auth/me", token);
      userId = me.user_id;
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // userId is embedded in the orderId which splits on "_" -- an
    // underscore would make the webhook parse ambiguous.
    if (userId.includes("_")) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const { email, productId } = await req.json();

    if (!email || !productId) {
      return NextResponse.json({ error: "Missing email or productId" }, { status: 400 });
    }

    const product = getProduct(productId);
    if (!product) {
      return NextResponse.json({ error: `Unknown product: ${productId}` }, { status: 400 });
    }

    const safepay = new Safepay({
      environment: getSafepayEnvironment(),
      apiKey: process.env.SAFEPAY_PUBLIC_KEY!,
      v1Secret: process.env.SAFEPAY_SECRET_KEY!,
      webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET!,
    });

    // orderId encodes BOTH userId and productId. productId may itself
    // contain an underscore (e.g. "engineering_bundle") -- see the
    // webhook route for the matching robust parse that handles this
    // correctly (splits on "_", takes parts[1] as userId, the LAST part
    // as the timestamp, and everything in between, rejoined, as productId).
    const orderId = `pxm_${userId}_${productId}_${Date.now()}`;

    const paymentToken = await safepay.payments.create({
      amount: product.price,
      currency: "PKR",
    });

    const checkoutUrl = safepay.checkout.create({
      token: paymentToken.token,
      orderId,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?status=cancelled`,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?status=success`,
      webhooks: true,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("Safepay checkout creation failed:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
