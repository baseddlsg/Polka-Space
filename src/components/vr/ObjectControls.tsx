import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useWallet } from "@/contexts/WalletContext";

const SHAPES = ["Box", "Sphere", "Cylinder", "Torus"];
const COLORS = [
  { name: "Purple", value: "#8B5CF6" },
  { name: "Blue", value: "#0EA5E9" },
  { name: "Green", value: "#10B981" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F97316" },
];

const ObjectControls = () => {
  const { selectedAccount } = useWallet();
  const [selectedShape, setSelectedShape] = useState("Box");
  const [selectedColor, setSelectedColor] = useState("#8B5CF6");
  const [scale, setScale] = useState(1);
  
  const handleCreateObject = () => {
    // In a real app, this would create the object in the VR scene
    console.log("Creating object:", { shape: selectedShape, color: selectedColor, scale });
  };
  
  const handleMintNFT = () => {
    if (!selectedAccount) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to mint NFTs"
      });
      return;
    }
    
    // This would trigger the NFT minting process
    console.log("Minting as NFT:", { 
      shape: selectedShape, 
      color: selectedColor, 
      scale,
      address: selectedAccount.address 
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-vr-purple">Object Creator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="shape" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="shape">Shape</TabsTrigger>
            <TabsTrigger value="color">Color</TabsTrigger>
            <TabsTrigger value="size">Size</TabsTrigger>
          </TabsList>
          <TabsContent value="shape" className="space-y-4">
            <div>
              <Label>Select Shape</Label>
              <RadioGroup 
                value={selectedShape} 
                onValueChange={setSelectedShape}
                className="flex flex-wrap gap-2 mt-2"
              >
                {SHAPES.map((shape) => (
                  <div key={shape} className="flex items-center space-x-2">
                    <RadioGroupItem value={shape} id={shape} />
                    <Label htmlFor={shape}>{shape}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </TabsContent>
          <TabsContent value="color" className="space-y-4">
            <div>
              <Label>Select Color</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {COLORS.map((color) => (
                  <button
                    key={color.name}
                    className={`w-8 h-8 rounded-full ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-vr-purple' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="size" className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <Label>Scale</Label>
                <span className="text-sm">{scale.toFixed(1)}x</span>
              </div>
              <Slider
                min={0.5}
                max={2}
                step={0.1}
                value={[scale]}
                onValueChange={(values) => setScale(values[0])}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleCreateObject} 
          className="flex-1 mr-2"
        >
          Create Object
        </Button>
        <Button 
          className="flex-1 bg-vr-purple hover:bg-vr-purple/90"
          onClick={handleMintNFT}
        >
          Mint as NFT
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ObjectControls;
