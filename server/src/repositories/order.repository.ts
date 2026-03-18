import { OrderModel } from "../models/order.model.js";
import type { OrderEntity, OrderStatus, OrderType } from "../types/order.js";

function logLine(message: string) {
  return {
    at: new Date(),
    message
  };
}

export const orderRepository = {
  async create(input: {
    orderId: string;
    type: OrderType;
    status: OrderStatus;
    amountKES: number;
    amountUSDCx: number;
    email?: string;
    userPhone?: string;
    userStacksAddress?: string;
    senderAddress?: string;
    txid?: string;
    mpesaCheckoutRequestId?: string;
    message: string;
  }) {
    const created = await OrderModel.create({
      ...input,
      errorLog: [logLine(input.message)]
    });
    return created.toObject();
  },

  async findByOrderId(orderId: string) {
    const doc = await OrderModel.findOne({ orderId }).lean<OrderEntity | null>();
    return doc;
  },

  async findByMpesaCheckoutRequestId(mpesaCheckoutRequestId: string) {
    return OrderModel.findOne({ mpesaCheckoutRequestId }).lean<OrderEntity | null>();
  },

  async appendLog(orderId: string, message: string) {
    await OrderModel.updateOne(
      { orderId },
      {
        $push: { errorLog: logLine(message) },
        $set: { updatedAt: new Date() }
      }
    );
  },

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    patch?: Partial<Pick<OrderEntity, "serverTxHash" | "mpesaReceiptNumber" | "mpesaCheckoutRequestId">>,
    logMessage?: string
  ) {
    const update: Record<string, unknown> = {
      status,
      updatedAt: new Date()
    };

    if (patch?.serverTxHash) update.serverTxHash = patch.serverTxHash;
    if (patch?.mpesaReceiptNumber) update.mpesaReceiptNumber = patch.mpesaReceiptNumber;
    if (patch?.mpesaCheckoutRequestId) update.mpesaCheckoutRequestId = patch.mpesaCheckoutRequestId;

    const queryUpdate: Record<string, unknown> = { $set: update };
    if (logMessage) {
      queryUpdate.$push = { errorLog: logLine(logMessage) };
    }

    await OrderModel.updateOne({ orderId }, queryUpdate);
  }
};
