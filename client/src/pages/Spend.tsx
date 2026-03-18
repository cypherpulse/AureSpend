import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { openContractCall } from "@stacks/connect";
import { uintCV, principalCV, noneCV } from "@stacks/transactions";
import toast from "react-hot-toast";
import ReactConfetti from "react-confetti";
import Stepper from "@/components/Stepper";
import ConfirmationModal from "@/components/ConfirmationModal";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import StatusIndicator from "@/components/StatusIndicator";
import { getRate, getServerAddress, submitOfframpTx, getOrder } from "@/services/api";
import type { SpendStep, OrderStatus } from "@/types";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const USDCX_CONTRACT = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const USDCX_NAME = "usdcx";

const schema = z.object({
  amountUSDCx: z.coerce
    .number({ invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be positive")
    .max(100000, "Amount too large"),
  phone: z
    .string()
    .regex(/^2547\d{8}$/, "Format: 2547XXXXXXXX"),
});

type FormData = z.infer<typeof schema>;

const STEPS = ["Details", "Send USDCx", "Verifying", "Complete"];

interface SpendProps {
  walletAddress: string | null;
  connected: boolean;
  onConnect: () => void;
}

export default function Spend({ walletAddress, connected, onConnect }: SpendProps) {
  const [step, setStep] = useState<SpendStep>("details");
  const [rate, setRate] = useState<number>(129);
  const [serverAddress, setServerAddress] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<{ amountKES: number; amountUSDCx: number } | null>(null);
  const [pollStatus, setPollStatus] = useState<OrderStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amountUSDCx: undefined, phone: "" },
  });

  const amountUSDCx = watch("amountUSDCx");
  const previewKES = amountUSDCx ? (Number(amountUSDCx) * rate).toFixed(2) : "0.00";

  useEffect(() => {
    Promise.all([getRate(), getServerAddress()])
      .then(([r, a]) => {
        setRate(r.kesPerUSDCx);
        setServerAddress(a.serverStacksAddress);
      })
      .catch(() => toast.error("Failed to load rate"));
  }, []);

  // Resume polling from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("aurespend_order_offramp");
    if (saved && step === "details") {
      setOrderId(saved);
      setStep("verifying");
    }
  }, []);

  // Polling
  useEffect(() => {
    if (step !== "verifying" || !orderId) return;
    const timer = setInterval(async () => {
      try {
        const data = await getOrder(orderId);
        setPollStatus(data.status);
        setOrderData({ amountKES: data.amountKES, amountUSDCx: data.amountUSDCx });
        if (["completed", "failed"].includes(data.status)) {
          clearInterval(timer);
          if (data.status === "completed") {
            setStep("complete");
            setShowConfetti(true);
            localStorage.removeItem("aurespend_order_offramp");
            setTimeout(() => setShowConfetti(false), 5000);
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [step, orderId]);

  const formData = useCallback(() => {
    return watch();
  }, [watch]);

  const onContinue = () => {
    if (!connected) {
      toast.error("Connect your wallet first");
      onConnect();
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirm(false);
    setStep("send");
  };

  const handleSendFromWallet = async () => {
    if (!walletAddress) return;
    const data = formData();
    const microAmount = Math.round(Number(data.amountUSDCx) * 1_000_000);

    try {
      await openContractCall({
        contractAddress: USDCX_CONTRACT,
        contractName: USDCX_NAME,
        functionName: "transfer",
        functionArgs: [
          uintCV(microAmount),
          principalCV(walletAddress),
          principalCV(serverAddress),
          noneCV(),
        ],
        network: "testnet",
        onFinish: async (result) => {
          const txid = result.txId;
          setTxHash(txid);
          setSubmitting(true);
          try {
            const res = await submitOfframpTx({
              txid,
              senderAddress: walletAddress,
              expectedAmountUSDCx: Number(data.amountUSDCx),
              userPhone: data.phone,
            });
            setOrderId(res.orderId);
            localStorage.setItem("aurespend_order_offramp", res.orderId);
            setStep("verifying");
            toast.success("Transaction submitted!");
          } catch (err: any) {
            toast.error(err.message || "Failed to submit");
          } finally {
            setSubmitting(false);
          }
        },
        onCancel: () => {
          toast("Transaction cancelled");
          setStep("details");
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Wallet error");
    }
  };

  const stepIndex =
    step === "details" ? 0 : step === "send" ? 1 : step === "verifying" ? 2 : 3;

  const getStatusMessage = () => {
    switch (pollStatus) {
      case "pending": return { status: "pending" as const, msg: "Verifying on Stacks...", sub: "This may take a few minutes" };
      case "payment_received": return { status: "pending" as const, msg: "Transaction confirmed", sub: "Requesting M-PESA payout..." };
      case "fiat_sent": return { status: "pending" as const, msg: "Payout sent", sub: "Arriving in your M-PESA soon" };
      case "failed": return { status: "error" as const, msg: "Transaction failed", sub: "Please try again" };
      default: return { status: "pending" as const, msg: "Processing...", sub: "" };
    }
  };

  const handleReset = () => {
    setStep("details");
    setOrderId(null);
    setTxHash(null);
    setOrderData(null);
    setPollStatus(null);
    setShowConfetti(false);
    localStorage.removeItem("aurespend_order_offramp");
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={200} />}

      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Spend USDCx</h1>
      </div>

      <Stepper steps={STEPS} currentStep={stepIndex} />

      {/* Step 1: Details */}
      {step === "details" && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit(onContinue)}
          className="space-y-4"
        >
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Amount USDCx
              </label>
              <input
                {...register("amountUSDCx")}
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
              {errors.amountUSDCx && (
                <p className="text-xs text-destructive mt-1">{errors.amountUSDCx.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary">
              <span className="text-xs text-muted-foreground">You will receive</span>
              <span className="font-bold text-foreground">≈ KES {Number(previewKES).toLocaleString()}</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                M-PESA Phone
              </label>
              <input
                {...register("phone")}
                placeholder="2547XXXXXXXX"
                className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
              {errors.phone && (
                <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Wallet Address
              </label>
              <div className="w-full bg-input border border-border rounded-xl px-4 py-3 text-muted-foreground text-sm font-mono truncate">
                {walletAddress || "Connect wallet →"}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Rate: 1 USDCx = {rate} KES
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            className="w-full py-4 rounded-xl gradient-orange text-primary-foreground font-bold text-base glow-orange"
          >
            Continue to Send
          </motion.button>
        </motion.form>
      )}

      {/* Step 2: Send USDCx */}
      {step === "send" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Send exactly <span className="text-foreground font-bold">{Number(watch("amountUSDCx")).toFixed(6)} USDCx</span> to:
            </p>
            <QRCodeDisplay value={serverAddress} label="Server deposit address" />
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSendFromWallet}
            disabled={submitting}
            className="w-full py-4 rounded-xl gradient-orange text-primary-foreground font-bold text-base glow-orange disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Send from Wallet"}
          </motion.button>
        </motion.div>
      )}

      {/* Step 3: Verifying */}
      {step === "verifying" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 rounded-2xl">
          {(() => {
            const s = getStatusMessage();
            return <StatusIndicator status={s.status} message={s.msg} subMessage={s.sub} />;
          })()}
          {txHash && (
            <p className="text-xs text-muted-foreground text-center font-mono truncate mt-2">
              Tx: {txHash}
            </p>
          )}
          {pollStatus === "failed" && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="w-full mt-4 py-3 rounded-xl bg-secondary text-foreground font-semibold"
            >
              Retry
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Step 4: Complete */}
      {step === "complete" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 rounded-2xl space-y-4"
        >
          <div className="text-center">
            <p className="text-3xl mb-2">🎉</p>
            <h2 className="text-xl font-bold text-foreground">Payout Complete!</h2>
          </div>

          <div className="space-y-2 bg-secondary rounded-xl p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">USDCx Spent</span>
              <span className="font-semibold text-foreground">{orderData?.amountUSDCx}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KES Received</span>
              <span className="font-semibold text-foreground">KES {orderData?.amountKES?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span className="font-semibold text-foreground">1 USDCx = {rate} KES</span>
            </div>
            {txHash && (
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-muted-foreground">Tx Hash</span>
                <a
                  href={`https://explorer.hiro.so/txid/${txHash}?chain=testnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-primary text-xs font-mono hover:underline"
                >
                  {txHash.slice(0, 10)}... <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="w-full py-3 rounded-xl bg-secondary text-foreground font-semibold"
          >
            Done
          </motion.button>
        </motion.div>
      )}

      <ConfirmationModal
        open={showConfirm}
        title="Confirm Spend"
        message={`Send exactly ${Number(watch("amountUSDCx") || 0).toFixed(6)} USDCx to the server? You will receive ≈ KES ${Number(previewKES).toLocaleString()} via M-PESA.`}
        confirmLabel="Continue"
        onConfirm={handleConfirmSend}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
