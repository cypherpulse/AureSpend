import { randomUUID } from "node:crypto";
import { orderRepository } from "../repositories/order.repository.js";
import { env } from "../config/env.js";
import { darajaService } from "./daraja.service.js";
import { settlementQueue } from "./queue.js";
import { HttpError } from "../middleware/error-handler.js";

function calcUsdcx(amountKES: number) {
  return Number((amountKES / env.KES_PER_USDCX).toFixed(6));
}

export const orderService = {
  async createOnrampOrder(input: {
    amountKES: number;
    email: string;
    phone: string;
    userStacksAddress: string;
  }) {
    const orderId = `onr-${randomUUID()}`;
    const amountUSDCx = calcUsdcx(input.amountKES);

    const stk = await darajaService.stkPush({
      amountKES: input.amountKES,
      phone: input.phone,
      accountReference: orderId,
      description: "Aurespend Onramp"
    });

    const created = await orderRepository.create({
      orderId,
      type: "onramp",
      status: "pay_offline",
      amountKES: input.amountKES,
      amountUSDCx,
      email: input.email,
      userPhone: input.phone,
      userStacksAddress: input.userStacksAddress,
      mpesaCheckoutRequestId: stk.checkoutRequestId,
      message: `STK push initiated (${stk.checkoutRequestId})`
    });

    await settlementQueue.scheduleOnrampTimeout(orderId);

    return {
      orderId: created.orderId,
      amountKES: created.amountKES,
      amountUSDCx: created.amountUSDCx,
      mpesaCheckoutRequestId: created.mpesaCheckoutRequestId,
      status: created.status,
      displayText: "Complete STK push on your phone to continue.",
      message: "M-PESA STK push sent"
    };
  },

  async verifyOnramp(orderId: string) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new HttpError(404, "Order not found");

    return {
      orderId: order.orderId,
      status: order.status,
      amountKES: order.amountKES,
      amountUSDCx: order.amountUSDCx,
      serverTxHash: order.serverTxHash,
      message: order.errorLog.at(-1)?.message ?? "ok"
    };
  },

  async submitOfframpTx(input: {
    txid: string;
    senderAddress: string;
    expectedAmountUSDCx: number;
    userPhone: string;
    orderId?: string;
  }) {
    const orderId = input.orderId ?? `offr-${randomUUID()}`;
    const amountKES = Number((input.expectedAmountUSDCx * env.KES_PER_USDCX).toFixed(2));

    const existing = await orderRepository.findByOrderId(orderId);
    if (existing) {
      if (existing.type !== "offramp") {
        throw new HttpError(409, "Order ID already exists for onramp");
      }
      return {
        orderId: existing.orderId,
        status: existing.status,
        message: "Order already submitted"
      };
    }

    await orderRepository.create({
      orderId,
      type: "offramp",
      status: "pending",
      amountKES,
      amountUSDCx: input.expectedAmountUSDCx,
      senderAddress: input.senderAddress,
      txid: input.txid,
      userPhone: input.userPhone,
      message: "Offramp transaction submitted for verification"
    });

    await settlementQueue.enqueueOfframpSettlement(orderId);

    return {
      orderId,
      status: "pending" as const,
      message: "Offramp submission received"
    };
  },

  async getOrder(orderId: string) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new HttpError(404, "Order not found");

    return {
      orderId: order.orderId,
      type: order.type,
      status: order.status,
      amountKES: order.amountKES,
      amountUSDCx: order.amountUSDCx,
      userPhone: order.userPhone,
      serverTxHash: order.serverTxHash,
      mpesaCheckoutRequestId: order.mpesaCheckoutRequestId,
      errorLog: order.errorLog.map((x) => x.message)
    };
  }
};
