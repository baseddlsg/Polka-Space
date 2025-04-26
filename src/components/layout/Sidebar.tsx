
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import WalletConnect from "@/components/wallet/WalletConnect";
import ObjectControls from "@/components/vr/ObjectControls";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`h-screen bg-card border-r transition-all duration-300 ${collapsed ? 'w-14' : 'w-80'}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between p-4">
          {!collapsed && (
            <h2 className="text-lg font-semibold text-vr-purple">VR Genesis</h2>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>
        <Separator />
        
        {!collapsed ? (
          <ScrollArea className="flex-1 px-4 py-6">
            <div className="space-y-6">
              <WalletConnect />
              <ObjectControls />
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center pt-6 space-y-4">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <span className="sr-only">Wallet</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M16 14h.01" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <span className="sr-only">Objects</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
