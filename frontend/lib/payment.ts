import type { SafepayEnvironment } from "@sfpy/node-sdk/dist/types/safepay";

export const PRO_PRICE_PKR = 799;

export type { SafepayEnvironment };

const VALID_ENVIRONMENTS: SafepayEnvironment[] = ["sandbox", "production", "development"];

/**
 * Reads SAFEPAY_ENVIRONMENT from process.env and validates it against the
 * SDK's own SafepayEnvironment type (imported directly, not redeclared),
 * so this can never silently drift out of sync with what the SDK actually
 * accepts.
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
