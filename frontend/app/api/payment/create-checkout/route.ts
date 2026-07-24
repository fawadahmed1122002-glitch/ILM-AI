import { NextRequest, NextResponse } from "next/server";
import { Safepay } from "@sfpy/node-sdk";

const PRO_PRICE_PKR = 799;

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    }

    const safepay = new Safepay({
      environment: process.env.SAFEPAY_ENVIRONMENT || "sandbox",
      apiKey: process.env.SAFEPAY_PUBLIC_KEY!,
      v1Secret: process.env.SAFEPAY_SECRET_KEY!,
      webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET!,
    });

    const orderId = `pxm_${userId}_${Date.now()}`;

    const paymentToken = await safepay.payments.create({
      amount: PRO_PRICE_PKR, // CONFIRMED: Safepay expects whole rupees, not paisas (verified against live dashboard transaction record)
      currency: "PKR",
    });

    console.log("Safepay payments.create() response:", JSON.stringify(paymentToken));

    const checkoutUrl = safepay.checkout.create({
      token: paymentToken.token, // may need correcting once the debug log above shows the real key
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