import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import WalletButton from "./WalletButton";

interface NavbarProps {
  address: string | null;
  truncatedAddress: string | null;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Navbar({
  address,
  truncatedAddress,
  connected,
  onConnect,
  onDisconnect,
}: NavbarProps) {
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/spend", label: "Spend" },
    { to: "/topup", label: "Top-up" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="hidden md:flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50"
    >
      <div className="flex items-center gap-8">
        <Link to="/" className="text-xl font-bold text-gradient-orange">
          Aurespend
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <WalletButton
        connected={connected}
        truncatedAddress={truncatedAddress}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    </motion.nav>
  );
}
