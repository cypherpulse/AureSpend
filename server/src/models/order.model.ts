import { Schema, model } from "mongoose";
import type { OrderEntity } from "../types/order.js";

const logSchema = new Schema(
  {
    at: { type: Date, required: true },
    message: { type: String, required: true, trim: true, maxlength: 500 }
  },
  { _id: false }
);

const orderSchema = new Schema<OrderEntity>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["onramp", "offramp"], required: true, index: true },
    status: {
      type: String,
      enum: [
        "pending",
        "pay_offline",
        "payment_received",
        "crypto_sent",
        "fiat_sent",
        "completed",
        "failed",
        "timeout"
      ],
      required: true,
      index: true
    },
    amountKES: { type: Number, required: true, min: 0 },
    amountUSDCx: { type: Number, required: true, min: 0 },
    email: { type: String, trim: true },
    userPhone: { type: String, trim: true },
    userStacksAddress: { type: String, trim: true },
    senderAddress: { type: String, trim: true },
    txid: { type: String, trim: true, index: true },
    mpesaCheckoutRequestId: { type: String, trim: true, index: true },
    mpesaReceiptNumber: { type: String, trim: true },
    serverTxHash: { type: String, trim: true },
    errorLog: { type: [logSchema], default: [] }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

orderSchema.index({ createdAt: -1 });

export const OrderModel = model<OrderEntity>("Order", orderSchema);
