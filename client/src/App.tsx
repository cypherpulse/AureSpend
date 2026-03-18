import { Toaster as HotToaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Dashboard from "@/pages/Dashboard";
import Spend from "@/pages/Spend";
import Topup from "@/pages/Topup";
import NotFound from "@/pages/NotFound";

const App = () => {
  const wallet = useWallet();

  return (
    <>
      <HotToaster
        position="top-center"
        toastOptions={{
          style: {
            background: "hsl(0 0% 8%)",
            color: "hsl(0 0% 100%)",
            border: "1px solid hsl(0 0% 15%)",
            borderRadius: "12px",
            fontSize: "14px",
          },
          success: {
            iconTheme: { primary: "hsl(24 100% 50%)", secondary: "hsl(0 0% 100%)" },
          },
        }}
      />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navbar
            address={wallet.address}
            truncatedAddress={wallet.truncatedAddress}
            connected={wallet.connected}
            onConnect={wallet.connect}
            onDisconnect={wallet.disconnect}
          />

          {/* Mobile wallet bar */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
            <span className="text-lg font-bold text-gradient-orange">Aurespend</span>
            <div className="scale-90 origin-right">
              <button
                onClick={wallet.connected ? wallet.disconnect : wallet.connect}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  wallet.connected
                    ? "bg-secondary border border-border text-foreground"
                    : "gradient-orange text-primary-foreground glow-orange"
                }`}
              >
                {wallet.connected ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {wallet.truncatedAddress}
                  </>
                ) : (
                  "Connect"
                )}
              </button>
            </div>
          </div>

          <main className="pb-24 md:pb-8">
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    connected={wallet.connected}
                    address={wallet.address}
                    onConnect={wallet.connect}
                  />
                }
              />
              <Route
                path="/spend"
                element={
                  <Spend
                    walletAddress={wallet.address}
                    connected={wallet.connected}
                    onConnect={wallet.connect}
                  />
                }
              />
              <Route
                path="/topup"
                element={
                  <Topup
                    walletAddress={wallet.address}
                    connected={wallet.connected}
                    onConnect={wallet.connect}
                  />
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <BottomNav />
        </div>
      </BrowserRouter>
    </>
  );
};

export default App;
