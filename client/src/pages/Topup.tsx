import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import ReactConfetti from "react-confetti";
import Stepper from "@/components/Stepper";
import StatusIndicator from "@/components/StatusIndicator";
import { getRate, chargeOnramp, verifyOnramp, getOrder } from "@/services/api";
import type { TopupStep, OrderStatus } from "@/types";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const schema = z.object({
  amountKES: z.coerce
    .number({ invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be positive")
    .max(500000, "Amount too large"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^2547\d{8}$/, "Format: 2547XXXXXXXX"),
});

type FormData = z.infer<typeof schema>;
const STEPS = ["Details", "Pay M-PESA", "Confirming", "Complete"];

interface TopupProps {
  walletAddress: string | null;
  connected: boolean;
  onConnect: () => void;
}

export default function Topup({ walletAddress, connected, onConnect }: TopupProps) {
  const [step, setStep] = useState<TopupStep>("details");
  const [rate, setRate] = useState<number>(129);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(180);
  const [pollStatus, setPollStatus] = useState<OrderStatus | null>(null);
  const [orderResult, setOrderResult] = useState<{ amountKES: number; amountUSDCx: number; txHash: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amountKES: undefined, email: "", phone: "" },
  });

  const amountKES = watch("amountKES");
  const previewUSDCx = amountKES ? (Number(amountKES) / rate).toFixed(6) : "0.000000";

  useEffect(() => {
    getRate()
      .then((r) => setRate(r.kesPerUSDCx))
      .catch(() => toast.error("Failed to load rate"));
  }, []);

  // Resume
  useEffect(() => {
    const saved = localStorage.getItem("aurespend_order_onramp");
    if (saved && step === "details") {
      setOrderId(saved);
      setStep("confirming");
    }
  }, []);

  // Countdown
  useEffect(() => {
    if (step !== "paying") return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setPollStatus("timeout");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Polling for paying step
  useEffect(() => {
    if (step !== "paying" || !orderId) return;
    const timer = setInterval(async () => {
      try {
        const data = await verifyOnramp(orderId);
        setPollStatus(data.status);
        if (data.status === "payment_received") {
          clearInterval(timer);
          setStep("confirming");
          setOrderResult({
            amountKES: data.amountKES || 0,
            amountUSDCx: data.amountUSDCx || 0,
            txHash: null,
          });
        } else if (data.status === "failed") {
          clearInterval(timer);
          toast.error(data.message || "Payment failed");
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [step, orderId]);

  // Polling for confirming step (waiting for crypto_sent)
  useEffect(() => {
    if (step !== "confirming" || !orderId) return;
    const timer = setInterval(async () => {
      try {
        const data = await getOrder(orderId);
        setPollStatus(data.status);
        if (data.status === "crypto_sent") {
          clearInterval(timer);
          setOrderResult({
            amountKES: data.amountKES,
            amountUSDCx: data.amountUSDCx,
            txHash: data.serverTxHash || null,
          });
          setStep("complete");
          setShowConfetti(true);
          localStorage.removeItem("aurespend_order_onramp");
          setTimeout(() => setShowConfetti(false), 5000);
        } else if (data.status === "failed") {
          clearInterval(timer);
          toast.error("Failed");
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [step, orderId]);

  const onPay = async (data: FormData) => {
    if (!connected || !walletAddress) {
      toast.error("Connect your wallet first");
      onConnect();
      return;
    }
    setLoading(true);
    try {
      const res = await chargeOnramp({
        amountKES: data.amountKES,
        email: data.email,
        phone: data.phone,
        userStacksAddress: walletAddress,
      });
      setOrderId(res.orderId);
      localStorage.setItem("aurespend_order_onramp", res.orderId);
      setOrderResult({ amountKES: res.amountKES, amountUSDCx: res.amountUSDCx, txHash: null });
      setCountdown(180);
      setStep("paying");
      toast.success("STK push sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("details");
    setOrderId(null);
    setCountdown(180);
    setPollStatus(null);
    setOrderResult(null);
    setShowConfetti(false);
    localStorage.removeItem("aurespend_order_onramp");
  };

  const stepIndex =
    step === "details" ? 0 : step === "paying" ? 1 : step === "confirming" ? 2 : 3;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={200} />}

      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Top-up USDCx</h1>
      </div>

      <Stepper steps={STEPS} currentStep={stepIndex} />

      {/* Step 1 */}
      {step === "details" && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit(onPay)}
          className="space-y-4"
        >
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Amount KES
              </label>
              <input
                {...register("amountKES")}
                type="number"
                placeholder="500"
                className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
              {errors.amountKES && (
                <p className="text-xs text-destructive mt-1">{errors.amountKES.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary">
              <span className="text-xs text-muted-foreground">You'll receive</span>
              <span className="font-bold text-foreground">≈ {previewUSDCx} USDCx</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@email.com"
                className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
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
            disabled={loading}
            className="w-full py-4 rounded-xl gradient-orange text-primary-foreground font-bold text-base glow-orange disabled:opacity-50"
          >
            {loading ? "Sending..." : "Pay with M-PESA"}
          </motion.button>
        </motion.form>
      )}

      {/* Step 2: Paying */}
      {step === "paying" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-6 rounded-2xl space-y-4"
        >
          <StatusIndicator
            status="waiting"
            message="Check Your Phone"
            subMessage={`Enter your M-PESA PIN to pay KES ${orderResult?.amountKES?.toLocaleString()}`}
          />

          <div className="text-center">
            <p className="text-2xl font-bold text-primary font-mono">
              {mins}:{secs.toString().padStart(2, "0")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Time remaining</p>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-orange rounded-full"
              initial={{ width: "100%" }}
              animate={{ width: `${(countdown / 180) * 100}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>

          {pollStatus === "timeout" && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="w-full py-3 rounded-xl bg-secondary text-foreground font-semibold"
            >
              Try Again
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Step 3: Confirming */}
      {step === "confirming" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 rounded-2xl">
          <StatusIndicator
            status="pending"
            message="Payment Confirmed!"
            subMessage={`Sending ${orderResult?.amountUSDCx} USDCx to your wallet...`}
          />
        </motion.div>
      )}

      {/* Step 4: Complete */}
      {step === "complete" && orderResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 rounded-2xl space-y-4"
        >
          <div className="text-center">
            <p className="text-3xl mb-2">🎉</p>
            <h2 className="text-xl font-bold text-foreground">USDCx Sent!</h2>
          </div>

          <div className="space-y-2 bg-secondary rounded-xl p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-semibold text-foreground">KES {orderResult.amountKES?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">USDCx Received</span>
              <span className="font-semibold text-foreground">{orderResult.amountUSDCx}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span className="font-semibold text-foreground">1 USDCx = {rate} KES</span>
            </div>
            {orderResult.txHash && (
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-muted-foreground">Tx Hash</span>
                <a
                  href={`https://explorer.hiro.so/txid/${orderResult.txHash}?chain=testnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-primary text-xs font-mono hover:underline"
                >
                  {orderResult.txHash.slice(0, 10)}... <ExternalLink size={10} />
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
    </div>
  );
}
