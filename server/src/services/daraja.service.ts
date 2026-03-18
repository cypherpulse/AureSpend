import axios from "axios";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

type StkPushResult = {
  checkoutRequestId: string;
  merchantRequestId: string;
  responseDescription: string;
};

function normalizeKenyanPhone(phone: string) {
  const trimmed = phone.replace(/\s+/g, "");
  if (trimmed.startsWith("254")) return trimmed;
  if (trimmed.startsWith("+254")) return trimmed.slice(1);
  if (trimmed.startsWith("0")) return `254${trimmed.slice(1)}`;
  return trimmed;
}

async function getAccessToken() {
  if (!env.DARAJA_CONSUMER_KEY || !env.DARAJA_CONSUMER_SECRET) {
    throw new Error("Daraja credentials are missing");
  }

  const auth = Buffer.from(`${env.DARAJA_CONSUMER_KEY}:${env.DARAJA_CONSUMER_SECRET}`).toString("base64");
  const { data } = await axios.get<{ access_token: string }>(
    `${env.DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${auth}` },
      timeout: 15000
    }
  );

  return data.access_token;
}

function timestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export const darajaService = {
  async stkPush(input: { amountKES: number; phone: string; accountReference: string; description: string }): Promise<StkPushResult> {
    if (env.ENABLE_DARAJA_MOCK) {
      return {
        checkoutRequestId: `mock-checkout-${randomUUID()}`,
        merchantRequestId: `mock-merchant-${randomUUID()}`,
        responseDescription: "Mock STK push accepted"
      };
    }

    if (!env.DARAJA_SHORTCODE || !env.DARAJA_PASSKEY || !env.DARAJA_CALLBACK_URL) {
      throw new Error("Daraja STK config is incomplete");
    }

    const token = await getAccessToken();
    const ts = timestamp();
    const password = Buffer.from(`${env.DARAJA_SHORTCODE}${env.DARAJA_PASSKEY}${ts}`).toString("base64");

    const { data } = await axios.post(
      `${env.DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: env.DARAJA_SHORTCODE,
        Password: password,
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(input.amountKES),
        PartyA: normalizeKenyanPhone(input.phone),
        PartyB: env.DARAJA_SHORTCODE,
        PhoneNumber: normalizeKenyanPhone(input.phone),
        CallBackURL: env.DARAJA_CALLBACK_URL,
        AccountReference: input.accountReference,
        TransactionDesc: input.description
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000
      }
    );

    return {
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      responseDescription: data.ResponseDescription ?? "STK push initiated"
    };
  },

  async b2cPayout(input: { amountKES: number; phone: string; remarks: string; occasion?: string }) {
    if (env.ENABLE_DARAJA_MOCK) {
      return {
        conversationId: `mock-conv-${randomUUID()}`,
        originatorConversationId: `mock-origin-${randomUUID()}`,
        responseDescription: "Mock B2C queued"
      };
    }

    if (
      !env.DARAJA_SHORTCODE ||
      !env.DARAJA_INITIATOR_NAME ||
      !env.DARAJA_SECURITY_CREDENTIAL ||
      !env.DARAJA_B2C_RESULT_URL ||
      !env.DARAJA_B2C_TIMEOUT_URL
    ) {
      throw new Error("Daraja B2C config is incomplete");
    }

    const token = await getAccessToken();
    const { data } = await axios.post(
      `${env.DARAJA_BASE_URL}/mpesa/b2c/v1/paymentrequest`,
      {
        InitiatorName: env.DARAJA_INITIATOR_NAME,
        SecurityCredential: env.DARAJA_SECURITY_CREDENTIAL,
        CommandID: "BusinessPayment",
        Amount: Math.round(input.amountKES),
        PartyA: env.DARAJA_SHORTCODE,
        PartyB: normalizeKenyanPhone(input.phone),
        Remarks: input.remarks,
        QueueTimeOutURL: env.DARAJA_B2C_TIMEOUT_URL,
        ResultURL: env.DARAJA_B2C_RESULT_URL,
        Occasion: input.occasion ?? "Aurespend Offramp"
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000
      }
    );

    return {
      conversationId: data.ConversationID,
      originatorConversationId: data.OriginatorConversationID,
      responseDescription: data.ResponseDescription ?? "B2C request submitted"
    };
  }
};
