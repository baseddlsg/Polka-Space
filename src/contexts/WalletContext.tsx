import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { InjectedExtension } from "@polkadot/extension-inject/types";
import { web3Accounts, web3Enable, web3FromSource } from "@polkadot/extension-dapp";
import { encodeAddress } from "@polkadot/util-crypto";
import { toast } from "sonner";

interface Account {
  address: string;
  meta: {
    name?: string;
    source: string;
  };
  signer?: any;
}

interface WalletContextType {
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => void;
  isWalletConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  accounts: Account[];
  chainType: 'substrate' | 'evm' | null;
  setChainType: (type: 'substrate' | 'evm' | null) => void;
  papiConnected: boolean;
  connectToPAPI: () => Promise<void>;
  disconnectFromPAPI: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [extensions, setExtensions] = useState<InjectedExtension[]>([]);
  const [chainType, setChainType] = useState<'substrate' | 'evm' | null>(null);
  const [papiConnected, setPapiConnected] = useState<boolean>(false);
  
  // Check for stored wallet connection on app load
  useEffect(() => {
    const storedAccount = localStorage.getItem('selectedWalletAccount');
    const storedChainType = localStorage.getItem('selectedChainType') as 'substrate' | 'evm' | null;
    
    if (storedAccount) {
      try {
        const account = JSON.parse(storedAccount);
        setSelectedAccount(account);
        setChainType(storedChainType);
        
        // Re-establish connection silently
        connectWallet(false);
      } catch (error) {
        console.error("Failed to restore wallet connection:", error);
        localStorage.removeItem('selectedWalletAccount');
        localStorage.removeItem('selectedChainType');
      }
    }
  }, []);
  
  const connectWallet = async (showToasts = true) => {
    try {
      if (showToasts) {
        toast.loading("Connecting to wallet...");
      }
      
      // Enable all available extensions
      const extensions = await web3Enable('VR Genesis Frame');
      if (extensions.length === 0) {
        if (showToasts) {
          toast.error("No wallet extension found", {
            description: "Please install Polkadot.js, MetaMask, or other compatible wallet"
          });
        }
        return;
      }
      setExtensions(extensions);

      // Get all accounts from extensions
      const allAccounts = await web3Accounts();
      
      // Add signers to accounts
      const accountsWithSigners = await Promise.all(
        allAccounts.map(async (account) => {
          const injector = await web3FromSource(account.meta.source);
          return {
            ...account,
            signer: injector.signer
          };
        })
      );
      
      setAccounts(accountsWithSigners);
      
      // If we have a previously selected account, try to find it in the new accounts list
      if (selectedAccount) {
        const foundAccount = accountsWithSigners.find(
          acc => acc.address === selectedAccount.address
        );
        
        if (foundAccount) {
          setSelectedAccount(foundAccount);
          if (showToasts) {
            toast.success(`Reconnected to ${foundAccount.meta.name || foundAccount.address.slice(0, 6)}...`);
          }
          return;
        }
      }
      
      // Otherwise set first account as default if available
      if (accountsWithSigners.length > 0) {
        const account = accountsWithSigners[0];
        setSelectedAccount(account);
        setChainType('substrate'); // Default to substrate
        
        // Store for session persistence
        localStorage.setItem('selectedWalletAccount', JSON.stringify(account));
        localStorage.setItem('selectedChainType', 'substrate');
        
        if (showToasts) {
          toast.success(`Connected to ${account.meta.name || account.address.slice(0, 6)}...`);
        }
      } else if (showToasts) {
        toast.error("No accounts found in wallet");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      if (showToasts) {
        toast.error("Failed to connect wallet", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  };
  
  const disconnectWallet = () => {
    setSelectedAccount(null);
    setChainType(null);
    localStorage.removeItem('selectedWalletAccount');
    localStorage.removeItem('selectedChainType');
    disconnectFromPAPI();
    toast.success("Wallet disconnected");
  };

  const connectToPAPI = async () => {
    try {
      toast.loading("Connecting to PAPI...");
      
      // Call backend API to initialize PAPI connection
      const response = await fetch('/api/papi/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: selectedAccount?.address,
          chainType: chainType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to PAPI');
      }

      const result = await response.json();
      setPapiConnected(true);
      
      toast.success("Connected to PAPI", {
        description: "Enhanced blockchain features enabled"
      });
      
      return result;
    } catch (error) {
      console.error("PAPI connection error:", error);
      setPapiConnected(false);
      toast.error("Failed to connect to PAPI", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  };

  const disconnectFromPAPI = () => {
    setPapiConnected(false);
    // Optionally call backend to cleanup PAPI connections
    fetch('/api/papi/disconnect', { method: 'POST' }).catch(console.error);
  };

  // Auto-connect to PAPI when wallet is connected
  useEffect(() => {
    if (selectedAccount && chainType === 'substrate' && !papiConnected) {
      connectToPAPI().catch(console.error);
    }
  }, [selectedAccount, chainType]);
  
  return (
    <WalletContext.Provider value={{
      selectedAccount,
      setSelectedAccount,
      isWalletConnected: !!selectedAccount,
      connectWallet,
      disconnectWallet,
      accounts,
      chainType,
      setChainType,
      papiConnected,
      connectToPAPI,
      disconnectFromPAPI
    }}>
      {children}
    </WalletContext.Provider>
  );
}
