
import { useEffect, useState } from "react";
import VRScene from "@/components/vr/VRScene";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const VRWorld = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isVRSupported, setIsVRSupported] = useState(true);

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
      <Sidebar />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-vr-purple">VR Genesis Frame</h1>
            <p className="text-sm text-muted-foreground">Create, customize and mint 3D objects as NFTs</p>
          </div>
          
          <div className="flex items-center gap-2">
            {isVRSupported ? (
              <Badge className="bg-green-500">VR Ready</Badge>
            ) : (
              <Badge variant="destructive">VR Not Supported</Badge>
            )}
            <Button className="bg-vr-purple hover:bg-vr-purple/90" disabled={!isVRSupported}>
              Enter VR
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
          
          <VRScene />
        </div>
      </div>
    </div>
  );
};

export default VRWorld;
