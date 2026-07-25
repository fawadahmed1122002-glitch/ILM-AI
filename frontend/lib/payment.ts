import { Environment } from "@sfpy/node-sdk/dist/utils/constants";
import type { SafepayEnvironment } from "@sfpy/node-sdk/dist/types/safepay";

export const PRO_PRICE_PKR = 799;

const ENV_MAP: Record<string, SafepayEnvironment> = {
  sandbox: Environment.Sandbox,
  production: Environment.Production,
  development: Environment.Development,
};

export function getSafepayEnvironment(): SafepayEnvironment {
  const raw = (process.env.SAFEPAY_ENVIRONMENT || "sandbox").toLowerCase();
  const match = ENV_MAP[raw];
  if (!match) {
    throw new Error(
      `Invalid SAFEPAY_ENVIRONMENT: "${raw}". Must be one of: ${Object.keys(ENV_MAP).join(", ")}`
    );
  }
  return match;
}
