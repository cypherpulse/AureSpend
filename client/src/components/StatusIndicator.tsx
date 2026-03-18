import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface StatusIndicatorProps {
  status: "pending" | "success" | "error" | "waiting";
  message: string;
  subMessage?: string;
}

const config = {
  pending: { icon: Loader2, spin: true, color: "text-primary" },
  waiting: { icon: Clock, spin: false, color: "text-primary" },
  success: { icon: CheckCircle2, spin: false, color: "text-green-500" },
  error: { icon: XCircle, spin: false, color: "text-destructive" },
};

export default function StatusIndicator({ status, message, subMessage }: StatusIndicatorProps) {
  const { icon: Icon, spin, color } = config[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center gap-4 py-8"
    >
      <Icon
        size={48}
        className={`${color} ${spin ? "animate-spin" : ""}`}
      />
      <div>
        <p className="text-lg font-semibold text-foreground">{message}</p>
        {subMessage && (
          <p className="text-sm text-muted-foreground mt-1">{subMessage}</p>
        )}
      </div>
    </motion.div>
  );
}
