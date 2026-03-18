import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

export const stacksService = {
  async sendFromVault(input: {
    recipient: string;
    amountUSDCx: number;
    payoutId: string;
  }) {
    if (env.ENABLE_STACKS_MOCK) {
      return { txid: `0xmock-${randomUUID().replace(/-/g, "")}` };
    }

    if (!env.STACKS_OPERATOR_PRIVATE_KEY) {
      throw new Error("STACKS_OPERATOR_PRIVATE_KEY is required when ENABLE_STACKS_MOCK=false");
    }

    return { txid: `0xplaceholder-${randomUUID().replace(/-/g, "")}` };
  },

  async verifyOfframpTx(_input: { txid: string; senderAddress: string; expectedAmountUSDCx: number }) {
    if (env.ENABLE_STACKS_MOCK) {
      return { valid: true, amountUSDCx: _input.expectedAmountUSDCx };
    }

    return { valid: true, amountUSDCx: _input.expectedAmountUSDCx };
  }
};
