
import { createContext, useContext, useState, ReactNode } from "react";
import { toast } from "sonner";

interface Account {
  address: string;
  meta: {
    name?: string;
    source: string;
  };
}

interface WalletContextType {
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => void;
  isWalletConnected: boolean;
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
  
  return (
    <WalletContext.Provider value={{
      selectedAccount,
      setSelectedAccount,
      isWalletConnected: !!selectedAccount,
    }}>
      {children}
    </WalletContext.Provider>
  );
}
