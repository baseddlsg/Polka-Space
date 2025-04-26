import { useState } from "react";
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-vr-purple">Wallet</CardTitle>
        <CardDescription>Connect your Polkadot wallet to mint NFTs</CardDescription>
      </CardHeader>
      <CardContent>
        {selectedAccount ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between p-2 rounded-md bg-muted">
              <div>
                <p className="font-medium">{selectedAccount.meta.name || "Account"}</p>
                <p className="text-sm text-muted-foreground">{formatAddress(selectedAccount.address)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(selectedAccount.address)}>
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 border rounded-md border-dashed">
            <p className="text-muted-foreground mb-4">No wallet connected</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {selectedAccount ? (
          <Button variant="destructive" className="w-full" onClick={disconnectWallet}>
            Disconnect Wallet
          </Button>
        ) : (
          <Button className="w-full bg-vr-purple hover:bg-vr-purple/90" onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default WalletConnect;
