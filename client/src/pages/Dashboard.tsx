import { motion } from "framer-motion";
import { ArrowUpFromLine, ArrowDownToLine, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardProps {
  connected: boolean;
  address: string | null;
  onConnect: () => void;
}

export default function Dashboard({ connected, address, onConnect }: DashboardProps) {
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 max-w-sm text-center"
        >
          <div className="w-20 h-20 rounded-2xl gradient-orange flex items-center justify-center glow-orange animate-pulse-glow">
            <Wallet size={36} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Connect Stacks Wallet</h1>
            <p className="text-sm text-muted-foreground">
              Connect to view balance and start spending
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onConnect}
            className="w-full py-4 rounded-xl gradient-orange text-primary-foreground font-bold text-base glow-orange"
          >
            Connect Wallet
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-2xl neumorphic"
      >
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
          USDCx Balance
        </p>
        <p className="text-4xl font-extrabold text-gradient-orange">
          —
          <span className="text-lg font-semibold text-muted-foreground ml-2">USDCx</span>
        </p>
        <p className="text-[10px] text-muted-foreground mt-2 font-mono truncate">
          {address}
        </p>
      </motion.div>

      {/* Action Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link to="/spend" className="block">
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="glass-card p-5 rounded-2xl gradient-orange glow-orange flex items-center gap-4 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <ArrowUpFromLine size={22} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-primary-foreground text-lg">Spend USDCx</p>
              <p className="text-xs text-primary-foreground/70">Send to M-PESA instantly</p>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link to="/topup" className="block">
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="glass-card p-5 rounded-2xl border-2 border-border hover:border-primary/40 transition-colors flex items-center gap-4 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <ArrowDownToLine size={22} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">Top-up USDCx</p>
              <p className="text-xs text-muted-foreground">Buy with M-PESA</p>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
