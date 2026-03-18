export type OrderStatus =
  | "pending"
  | "pay_offline"
  | "payment_received"
  | "crypto_sent"
  | "fiat_sent"
  | "completed"
  | "failed"
  | "timeout";

export interface RateResponse {
  kesPerUSDCx: number;
}

export interface ServerAddressResponse {
  serverStacksAddress: string;
}

export interface OnrampChargeRequest {
  amountKES: number;
  email: string;
  phone: string;
  userStacksAddress: string;
}

export interface OnrampChargeResponse {
  orderId: string;
  amountKES: number;
  amountUSDCx: number;
  paystackReference: string;
  status: string;
  displayText: string;
  message: string;
}

export interface OnrampVerifyResponse {
  orderId: string;
  status: OrderStatus;
  paystackStatus?: string;
  amountKES?: number;
  amountUSDCx?: number;
  serverTxHash?: string;
  message: string;
}

export interface OfframpSubmitRequest {
  txid: string;
  senderAddress: string;
  expectedAmountUSDCx: number;
  userPhone: string;
  orderId?: string;
}

export interface OfframpSubmitResponse {
  orderId: string;
  status: OrderStatus;
  message: string;
}

export interface OrderResponse {
  orderId: string;
  type: "onramp" | "offramp";
  status: OrderStatus;
  amountKES: number;
  amountUSDCx: number;
  userPhone?: string;
  serverTxHash?: string;
  paystackReference?: string;
  errorLog?: string[];
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number | null;
  loading: boolean;
}

export type SpendStep = "details" | "send" | "verifying" | "complete";
export type TopupStep = "details" | "paying" | "confirming" | "complete";
