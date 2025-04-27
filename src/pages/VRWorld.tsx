import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VRScene from "@/components/vr/VRScene";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const VRWorld = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isVRSupported, setIsVRSupported] = useState(true);
  const [showExplorer, setShowExplorer] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse URL params on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const explorer = searchParams.get('explorer');
    const tab = searchParams.get('tab');
    
    // Set explorer mode if URL param is present
    if (explorer === 'true') {
      setShowExplorer(true);
    }
    
    // Set active tab if URL param is present
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);
  
  // Update URL when explorer mode changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    
    if (showExplorer) {
      searchParams.set('explorer', 'true');
    } else {
      searchParams.delete('explorer');
    }
    
    const newSearch = searchParams.toString();
    const newPath = newSearch ? `${location.pathname}?${newSearch}` : location.pathname;
    
    // Update URL without refreshing the page
    navigate(newPath, { replace: true });
  }, [showExplorer, location.pathname, navigate]);
  
  // Update URL when active tab changes
  useEffect(() => {
    if (activeTab) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('tab', activeTab);
      
      const newSearch = searchParams.toString();
      const newPath = `${location.pathname}?${newSearch}`;
      
      // Update URL without refreshing the page
      navigate(newPath, { replace: true });
    }
  }, [activeTab, location.pathname, navigate]);

  useEffect(() => {
    // Check if WebXR is supported
    if ('xr' in navigator) {
      // @ts-ignore - TypeScript doesn't recognize isSessionSupported yet
      navigator.xr?.isSessionSupported('immersive-vr')
        .then((supported) => {
          setIsVRSupported(supported);
        })
        .catch(() => {
          setIsVRSupported(false);
        });
    } else {
      setIsVRSupported(false);
    }

    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      toast.success("VR World loaded", {
        description: "Welcome to VR Genesis Frame"
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-full flex overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Enhanced Header */}
        <header className="card-glass border-b p-4 flex items-center justify-between z-10">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">VR Genesis Frame</h1>
            <p className="text-sm text-muted-foreground">Create, customize and mint 3D objects as NFTs</p>
          </div>
          
          <div className="flex items-center gap-2">
            {isVRSupported ? (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">VR Ready</Badge>
            ) : (
              <Badge variant="destructive">VR Not Supported</Badge>
            )}
            <Button 
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 btn-hover-effect" 
              disabled={!isVRSupported}
              onClick={() => {
                if ('xr' in navigator) {
                  // @ts-ignore - TypeScript doesn't recognize requestSession yet
                  navigator.xr?.requestSession('immersive-vr', {
                    optionalFeatures: ['local-floor', 'bounded-floor']
                  }).then((session) => {
                    // Handle VR session
                    toast.info("VR Session started");
                  }).catch(err => {
                    toast.error("Failed to start VR", {
                      description: err.message
                    });
                  });
                }
              }}
            >
              Enter VR
            </Button>
            <Button
              variant="outline"
              className={showExplorer ? "bg-purple-100 text-purple-700" : ""}
              onClick={() => setShowExplorer(!showExplorer)}
            >
              {showExplorer ? "Exit Explorer" : "NFT Explorer"}
            </Button>
          </div>
        </header>
        
        {/* Main VR Canvas */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="vr-loading">
              <div className="text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-vr-purple border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
                <p className="mt-4">Loading VR World...</p>
              </div>
            </div>
          ) : null}
          
          <VRScene showExplorer={showExplorer} onExplorerChange={setShowExplorer} />
          
          {/* Status Bar */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 card-glass rounded-full px-4 py-2 text-sm text-gray-700 z-10">
            {showExplorer 
              ? "Explorer Mode: Browse and import your NFTs" 
              : "Position: (0, 0, 0) • Click to Select Objects"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VRWorld;
