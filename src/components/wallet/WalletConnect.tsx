import { useState } from "react";
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useWallet } from "@/contexts/WalletContext";

const WalletConnect = () => {
  const { selectedAccount, setSelectedAccount } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    
    try {
      const extensions = await web3Enable('VR Genesis Frame');
      
      if (extensions.length === 0) {
        toast.error("No Polkadot extension found", {
          description: "Please install Polkadot.js extension or compatible wallet"
        });
        return;
      }
      
      const allAccounts = await web3Accounts();
      
      if (allAccounts.length === 0) {
        toast.error("No accounts found", {
          description: "Please create an account in your Polkadot wallet"
        });
        return;
      }
      
      setSelectedAccount(allAccounts[0]);
      
      toast.success("Wallet connected", {
        description: `Connected with ${allAccounts[0].meta.name || allAccounts[0].address.slice(0, 6) + '...' + allAccounts[0].address.slice(-4)}`
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet", {
        description: "Please try again or use a different wallet"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setSelectedAccount(null);
    toast.info("Wallet disconnected");
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="w-full">
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1.5l-1.8-1.8A2 2 0 0012.2 2H7.8a2 2 0 00-1.4.6L4.6 4H4z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">Wallet</h2>
      </div>
      
      <div className="space-y-3">
        {selectedAccount ? (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Connected Address</div>
              <div className="flex justify-between items-center">
                <div className="font-medium">{selectedAccount.meta.name || "Account"}</div>
                <div className="font-mono text-sm truncate text-gray-500">{formatAddress(selectedAccount.address)}</div>
              </div>
            </div>
            <Button 
              onClick={disconnectWallet}
              className="w-full py-2 px-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              variant="outline"
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="text-center p-4 rounded-lg bg-gray-50 border border-gray-200 mb-4">
            <p className="text-gray-500 mb-4">No wallet connected</p>
            <Button 
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium hover:from-purple-600 hover:to-indigo-700 transition-all btn-hover-effect"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnect;
