export type OrderType = "onramp" | "offramp";

export type OrderStatus =
  | "pending"
  | "pay_offline"
  | "payment_received"
  | "crypto_sent"
  | "fiat_sent"
  | "completed"
  | "failed"
  | "timeout";

export interface OrderLog {
  at: Date;
  message: string;
}

export interface OrderEntity {
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
  mpesaReceiptNumber?: string;
  serverTxHash?: string;
  errorLog: OrderLog[];
  createdAt: Date;
  updatedAt: Date;
}
