// frontend/lib/payment.ts

export const PRO_PRICE_PKR = 799;

// Matches the exact set of values Safepay's SDK validates against
// internally (see dist/utils/validation.js: validateEnvironment).
export type SafepayEnvironment = "sandbox" | "production" | "development";

const VALID_ENVIRONMENTS: SafepayEnvironment[] = ["sandbox", "production", "development"];

/**
 * Reads SAFEPAY_ENVIRONMENT from process.env and validates it against the
 * exact literal union the Safepay SDK expects, rather than trusting a plain
 * string. Throws loudly at startup if misconfigured, instead of letting an
 * invalid environment silently reach the SDK constructor (which would throw
 * its own less-clear "Environment is invalid" error deep inside a request).
 */
export function getSafepayEnvironment(): SafepayEnvironment {
  const raw = process.env.SAFEPAY_ENVIRONMENT || "sandbox";
  if (!VALID_ENVIRONMENTS.includes(raw as SafepayEnvironment)) {
    throw new Error(
      `Invalid SAFEPAY_ENVIRONMENT: "${raw}". Must be one of: ${VALID_ENVIRONMENTS.join(", ")}`
    );
  }
  return raw as SafepayEnvironment;
}