import { useState, useEffect, useCallback } from "react";
import { showConnect, disconnect as stacksDisconnect } from "@stacks/connect";
import type { WalletState } from "@/types";

const WALLET_KEY = "aurespend_wallet";

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    balance: null,
    loading: true,
  });

  // Auto-reconnect from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(WALLET_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWallet({
          connected: true,
          address: parsed.address,
          balance: null,
          loading: false,
        });
      } catch {
        localStorage.removeItem(WALLET_KEY);
        setWallet((s) => ({ ...s, loading: false }));
      }
    } else {
      setWallet((s) => ({ ...s, loading: false }));
    }
  }, []);

  const connect = useCallback(() => {
    showConnect({
      appDetails: {
        name: "Aurespend",
        icon: window.location.origin + "/favicon.ico",
      },
      onFinish: (data) => {
        const address =
          data.authResponsePayload?.profile?.stxAddress?.testnet ||
          data.authResponsePayload?.profile?.stxAddress?.mainnet ||
          "";
        localStorage.setItem(WALLET_KEY, JSON.stringify({ address }));
        setWallet({
          connected: true,
          address,
          balance: null,
          loading: false,
        });
      },
      onCancel: () => {},
      userSession: undefined as any,
    });
  }, []);

  const disconnectWallet = useCallback(() => {
    localStorage.removeItem(WALLET_KEY);
    try {
      stacksDisconnect();
    } catch {}
    setWallet({
      connected: false,
      address: null,
      balance: null,
      loading: false,
    });
  }, []);

  const truncatedAddress = wallet.address
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : null;

  return {
    ...wallet,
    connect,
    disconnect: disconnectWallet,
    truncatedAddress,
  };
}
