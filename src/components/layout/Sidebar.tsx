import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import WalletConnect from "@/components/wallet/WalletConnect";
import ObjectControls from "@/components/vr/ObjectControls";
import { ArrowLeftRight, X, GripVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ReadyPlayerMeAvatar } from "../ReadyPlayerMeAvatar";
import { useAvatar } from "@/contexts/AvatarContext";
import { useWallet } from "@/contexts/WalletContext";

interface SidebarProps {
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { avatarUrl, setAvatarUrl } = useAvatar();
  const [showAvatar, setShowAvatar] = useState(true);
  const { selectedAccount } = useWallet();
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const minWidth = 280; // Minimum width
  const maxWidth = 500; // Maximum width

  const handleAvatarExport = async (url: string) => {
    setAvatarUrl(url);
  };

  // Handle mouse down on resize handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle mouse move during resize
  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing && !collapsed) {
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    }
  };

  // Handle mouse up after resize
  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div 
      ref={sidebarRef}
      className={`h-screen sidebar-gradient transition-all duration-300 relative ${collapsed ? 'w-14' : ''}`}
      style={{ width: collapsed ? '3.5rem' : `${sidebarWidth}px` }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between p-4">
          {!collapsed && (
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">
              VR Genesis
            </h2>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto btn-hover-effect"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>
        <Separator />
        
        {!collapsed ? (
          <ScrollArea className="flex-1 px-4 py-6 thin-scrollbar" style={{ width: `${sidebarWidth - 32}px` }}>
            <div className="space-y-6 pr-2">
              <div className="card-glass p-4">
                <WalletConnect />
              </div>
              
              <div className="card-glass p-4">
                <ObjectControls activeTab={activeTab} onTabChange={onTabChange} />
              </div>
              
              {/* Avatar Section */}
              <div className="card-glass p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold">Avatar</h3>
                  </div>
                  {showAvatar && (
                    <button
                      className="ml-2 p-1 rounded hover:bg-gray-200 btn-hover-effect"
                      onClick={() => setShowAvatar(false)}
                      title="Close Avatar Creator"
                    >
                      <X size={18} />
                    </button>
                  )}
                  {!showAvatar && (
                    <button
                      className="ml-2 p-1 rounded bg-gradient-to-r from-purple-500 to-indigo-600 text-white btn-hover-effect"
                      onClick={() => setShowAvatar(true)}
                    >
                      Open
                    </button>
                  )}
                </div>
                {showAvatar && (
                  <div
                    className="rounded-lg bg-white p-2"
                    style={{ maxHeight: 400, overflow: "auto" }}
                  >
                    <ReadyPlayerMeAvatar onAvatarExport={handleAvatarExport} />
                  </div>
                )}
                {avatarUrl && (
                   <div className="mt-2">
                    <h4 className="text-sm font-medium">Your Avatar GLB URL:</h4>
                    <a href={avatarUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{avatarUrl}</a>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center pt-6 space-y-4">
            <Button variant="ghost" size="icon" className="h-10 w-10 btn-hover-effect">
              <span className="sr-only">Wallet</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M16 14h.01" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 btn-hover-effect">
              <span className="sr-only">Objects</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </Button>
          </div>
        )}
      </div>
      
      {/* Resize handle */}
      {!collapsed && (
        <div 
          className="absolute top-0 right-0 w-4 h-full cursor-ew-resize flex items-center justify-center hover:bg-purple-100 transition-colors"
          onMouseDown={handleMouseDown}
        >
          <div className="h-20 flex items-center justify-center opacity-50 hover:opacity-100">
            <GripVertical size={16} className="text-purple-500" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
