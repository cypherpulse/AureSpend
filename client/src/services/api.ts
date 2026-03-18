import axios from "axios";
import type {
  RateResponse,
  ServerAddressResponse,
  OnrampChargeRequest,
  OnrampChargeResponse,
  OnrampVerifyResponse,
  OfframpSubmitRequest,
  OfframpSubmitResponse,
  OrderResponse,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE;

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Network error";
    return Promise.reject(new Error(typeof msg === "string" ? msg : JSON.stringify(msg)));
  }
);

export const getRate = () =>
  api.get<RateResponse>("/api/rate").then((r) => r.data);

export const getServerAddress = () =>
  api.get<ServerAddressResponse>("/api/server-address").then((r) => r.data);

export const chargeOnramp = (data: OnrampChargeRequest) =>
  api.post<OnrampChargeResponse>("/api/onramp/charge", data).then((r) => r.data);

export const verifyOnramp = (orderId: string) =>
  api.get<OnrampVerifyResponse>(`/api/onramp/verify/${orderId}`).then((r) => r.data);

export const submitOfframpTx = (data: OfframpSubmitRequest) =>
  api.post<OfframpSubmitResponse>("/api/offramp/submit-tx", data).then((r) => r.data);

export const getOrder = (orderId: string) =>
  api.get<OrderResponse>(`/api/orders/${orderId}`).then((r) => r.data);
