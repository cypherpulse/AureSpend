import { useState, useEffect, useCallback, useRef } from "react";
import { verifyOnramp, getOrder } from "@/services/api";
import type { OrderStatus } from "@/types";

interface PollState {
  status: OrderStatus | null;
  message: string;
  txHash: string | null;
  amountKES: number | null;
  amountUSDCx: number | null;
}

interface UsePollOrderOptions {
  orderId: string | null;
  type: "onramp" | "offramp";
  interval?: number;
  maxPolls?: number;
  enabled?: boolean;
}

const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
const STORAGE_KEY_PREFIX = env.VITE_STORAGE_KEY_PREFIX ?? "aurespend_order_";

export function usePollOrder({
  orderId,
  type,
  interval = 5000,
  maxPolls = 60,
  enabled = true,
}: UsePollOrderOptions) {
  const [state, setState] = useState<PollState>({
    status: null,
    message: "",
    txHash: null,
    amountKES: null,
    amountUSDCx: null,
  });
  const [polling, setPolling] = useState(false);
  const pollCount = useRef(0);

  // Save orderId for resume
  useEffect(() => {
    if (orderId) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${type}`, orderId);
    }
  }, [orderId, type]);

  const reset = useCallback(() => {
    setState({ status: null, message: "", txHash: null, amountKES: null, amountUSDCx: null });
    pollCount.current = 0;
    setPolling(false);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${type}`);
  }, [type]);

  useEffect(() => {
    if (!orderId || !enabled) return;
    setPolling(true);
    pollCount.current = 0;

    const timer = setInterval(async () => {
      pollCount.current++;

      try {
        let data: any;
        if (type === "onramp") {
          // Use verify endpoint first, then orders endpoint after payment_received
          const currentStatus = state.status;
          if (currentStatus === "payment_received" || currentStatus === "crypto_sent") {
            data = await getOrder(orderId);
          } else {
            data = await verifyOnramp(orderId);
          }
        } else {
          data = await getOrder(orderId);
        }

        setState({
          status: data.status,
          message: data.message || "",
          txHash: data.serverTxHash || null,
          amountKES: data.amountKES || null,
          amountUSDCx: data.amountUSDCx || null,
        });

        const terminal =
          type === "onramp"
            ? ["crypto_sent", "failed"]
            : ["completed", "failed"];

        if (terminal.includes(data.status)) {
          clearInterval(timer);
          setPolling(false);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }

      if (pollCount.current >= maxPolls) {
        clearInterval(timer);
        setPolling(false);
        setState((s) => ({
          ...s,
          status: "timeout",
          message: "Taking longer than expected. Please check back later.",
        }));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [orderId, type, interval, maxPolls, enabled]);

  // Get saved orderId for resume
  const savedOrderId = localStorage.getItem(`${STORAGE_KEY_PREFIX}${type}`);

  return { ...state, polling, reset, savedOrderId };
}
