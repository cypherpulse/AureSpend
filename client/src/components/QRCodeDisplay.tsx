import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface QRCodeDisplayProps {
  value: string;
  label?: string;
}

export default function QRCodeDisplay({ value, label }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4"
    >
      {label && (
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
      )}
      <div className="p-4 bg-foreground rounded-2xl">
        <QRCodeSVG value={value} size={160} bgColor="#ffffff" fgColor="#000000" />
      </div>
      <div className="flex items-center gap-2 w-full max-w-sm">
        <code className="flex-1 text-xs bg-secondary rounded-lg px-3 py-2.5 text-muted-foreground truncate font-mono">
          {value}
        </code>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="p-2.5 rounded-lg bg-secondary hover:bg-border transition-colors shrink-0"
          aria-label="Copy address"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-muted-foreground" />}
        </motion.button>
      </div>
    </motion.div>
  );
}
