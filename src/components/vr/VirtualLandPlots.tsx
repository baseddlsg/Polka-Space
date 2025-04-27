import { useState } from 'react';
import { Card } from '@/components/ui/card'; // Corrected import path
import { Button } from '@/components/ui/button'; // Corrected import path
import { useObjectStore, SceneObject } from '@/stores/objectStore'; // Corrected import name and added SceneObject import
import { toast } from "sonner"; // Added toast import

// Define a type for the plot template objects
type PlotTemplateObject = {
  id: string; // Added unique ID
  // Use only types allowed by SceneObject OR modelUrl, not both
  type?: 'box' | 'sphere' | 'cylinder' | 'torus'; // Removed 'model' from here
  modelUrl?: string; // Model URL is separate
  position: [number, number, number];
  scale: [number, number, number];
  color?: string; // Optional color for primitives
};

// Define a type for the plot data
type Plot = {
  id: number;
  name: string;
  thumbnail: string; // Kept for potential future use
  chain: string;
  description: string;
  template: PlotTemplateObject[];
};

const VirtualLandPlots = () => {
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null); // Added type annotation
  // Select functions directly from the store hook
  const { setObjects, addObject } = useObjectStore(); 

  // Predefined plot templates showcasing "cross-chain plots"
  const plots: Plot[] = [ // Added type annotation
    { 
      id: 1, 
      name: "Polkadot Plaza", 
      thumbnail: "/plots/plaza.jpg",
      chain: "Polkadot Relay",
      description: "Central community gathering space",
      template: [
        { id: 'plot1-obj1', modelUrl: '/models/small_table.glb', position: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] },
        { id: 'plot1-obj2', type: 'box', position: [5, 1, 5] as [number, number, number], scale: [2, 2, 2] as [number, number, number], color: "#E6007A" }
      ]
    },
    { 
      id: 2, 
      name: "Moonbeam Mansion", 
      thumbnail: "/plots/mansion.jpg",
      chain: "Moonbeam",
      description: "Luxury EVM-compatible estate",
      template: [
        { id: 'plot2-obj1', modelUrl: '/models/computer_monitor.glb', position: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] },
        { id: 'plot2-obj2', type: 'sphere', position: [-5, 3, 2] as [number, number, number], scale: [1, 1, 1] as [number, number, number], color: "#53CBC9" }
      ]
    },
    { 
      id: 3, 
      name: "Astar Arcade", 
      thumbnail: "/plots/arcade.jpg",
      chain: "Astar Network",
      description: "Interactive dApp showcase space",
      template: [
        { id: 'plot3-obj1', modelUrl: '/models/arcade.glb', position: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] },
        { id: 'plot3-obj2', type: 'cylinder', position: [3, 1, -4] as [number, number, number], scale: [1, 3, 1] as [number, number, number], color: "#00E676" }
      ]
    }
  ];
  
  // Added type for the plot parameter
  const loadPlotTemplate = (plot: Plot) => { 
    // Use setObjects([]) to clear the scene
    setObjects([]);
    
    // Add each object from the template
    plot.template.forEach(obj => {
      // Base object with common properties
      const baseObject = {
        id: `instance-${obj.id}-${Date.now()}`,
        position: obj.position,
        scale: obj.scale,
        rotation: [0, 0, 0] as [number, number, number], // Default rotation
      };

      // Construct the final object based on whether it's a model or primitive
      const newObject: SceneObject = obj.modelUrl
        ? { ...baseObject, modelUrl: obj.modelUrl } // If modelUrl exists, use it
        : { ...baseObject, type: obj.type, color: obj.color || '#ffffff' }; // Otherwise, use type and color
      
      // Type assertion is needed if type is undefined for primitives, providing a default
      if (!newObject.modelUrl && !newObject.type) {
         // This case shouldn't happen with current templates, but good for robustness
         (newObject as SceneObject).type = 'box'; // Default to box if type somehow missing
      }
       
      addObject(newObject);
    });
    
    // Show success message
    toast.success(`Loaded "${plot.name}" template`);
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Metaverse Land Plots</h2>
      <p className="text-sm mb-4">
        Discover cross-chain virtual spaces
      </p>
      
      <div className="space-y-3">
        {plots.map(plot => (
          <Card 
            key={plot.id}
            className={`p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition ${ // Adjusted hover bg for dark mode
              selectedPlot?.id === plot.id ? 'ring-2 ring-purple-500' : ''
            }`}
            onClick={() => setSelectedPlot(plot)}
          >
            <div className="flex items-center space-x-3">
              {/* Placeholder image using gradient */}
              <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500">
                <span className="text-white text-xl font-bold">{plot.name.substring(0, 1)}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{plot.name}</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400">#{plot.chain.replace(/\s+/g, '')}</p> {/* Hashtag style chain */}
                <p className="text-xs text-gray-500 dark:text-gray-400">{plot.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {selectedPlot && (
        <div className="mt-4">
          <Button 
            className="w-full bg-vr-purple hover:bg-vr-purple/90" // Use theme color
            onClick={() => loadPlotTemplate(selectedPlot)}
          >
            Load {selectedPlot.name}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VirtualLandPlots; 