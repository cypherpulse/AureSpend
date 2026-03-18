import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, LogOut, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";

interface WalletButtonProps {
  connected: boolean;
  truncatedAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  fullAddress?: string | null;
}

export default function WalletButton({
  connected,
  truncatedAddress,
  onConnect,
  onDisconnect,
  fullAddress,
}: WalletButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (fullAddress) {
      navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!connected) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConnect}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm glow-orange transition-shadow"
        aria-label="Connect Stacks Wallet"
      >
        <Wallet size={16} />
        Connect Wallet
      </motion.button>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-medium text-sm"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        <div className="w-2 h-2 rounded-full bg-green-500" />
        {truncatedAddress}
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-48 rounded-xl bg-card border border-border shadow-lg z-50 overflow-hidden"
            >
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                Copy Address
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDisconnect();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-secondary transition-colors border-t border-border"
              >
                <LogOut size={14} />
                Disconnect
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
