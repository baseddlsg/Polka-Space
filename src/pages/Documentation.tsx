import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft, Check, ExternalLink } from 'lucide-react';
import { analytics, EventType } from '@/services/analyticsService';

// Documentation sections data
const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: [
      {
        id: 'introduction',
        title: 'Introduction',
        text: `VR Genesis Frame is a 3D creation and NFT minting platform built on Polkadot. 
        It allows users to create, customize, and mint 3D objects as NFTs on multiple parachains.
        The platform combines WebXR technology with blockchain to create an immersive experience for NFT creation.`
      },
      {
        id: 'requirements',
        title: 'System Requirements',
        text: `
        - Modern web browser (Chrome, Firefox, or Edge)
        - WebGL and WebXR support
        - Polkadot-compatible wallet (for minting NFTs)
        - For VR: Compatible VR headset (Quest, Vive, etc.)
        `
      },
      {
        id: 'wallet-setup',
        title: 'Wallet Setup',
        text: `To use all features of VR Genesis Frame, you need to connect a Polkadot-compatible wallet.
        Click the "Connect Wallet" button in the sidebar to connect your wallet. 
        Supported wallets include Polkadot.js, SubWallet, and Talisman.`
      }
    ]
  },
  {
    id: 'vr-world',
    title: 'VR World',
    content: [
      {
        id: 'navigation',
        title: 'Navigation & Controls',
        text: `
        - WASD or Arrow keys: Move around the scene
        - Mouse: Look around
        - Click: Select objects
        - X or Backspace: Delete selected object
        - VR Mode: Enter immersive VR with supported headsets
        - Transform Controls: Move, rotate, and scale objects
        `
      },
      {
        id: 'object-creation',
        title: 'Object Creation',
        text: `Use the Object Creator panel to create primitive shapes:
        1. Select a shape (box, sphere, cylinder, torus)
        2. Choose a color
        3. Set the size using the slider
        4. Click "Add Shape" to add it to the scene
        
        You can also import pre-built models from the Library tab.`
      },
      {
        id: 'transform-controls',
        title: 'Transform Controls',
        text: `
        Select an object to activate transform controls. Use the buttons in the top-left corner to switch between:
        - Move: Reposition the object
        - Rotate: Change the orientation
        - Scale: Resize the object
        
        The transform gizmo will appear around the selected object, allowing precise manipulation.
        `
      }
    ]
  },
  {
    id: 'nft-features',
    title: 'NFT Features',
    content: [
      {
        id: 'minting',
        title: 'Minting NFTs',
        text: `To mint a 3D object as an NFT:
        1. Create or select an object
        2. Choose a blockchain (Unique, Moonbeam, or Astar)
        3. Click "Mint NFT" button
        4. Approve the transaction in your wallet
        5. Wait for the transaction to complete
        
        After minting, you can view your NFT in the NFT Gallery tab.`
      },
      {
        id: 'gallery',
        title: 'NFT Gallery',
        text: `The NFT Gallery tab shows all your minted and imported NFTs. From here you can:
        - Filter NFTs by blockchain
        - View NFT details
        - Import NFTs into your scene
        - View transaction details on blockchain explorers`
      },
      {
        id: 'explorer',
        title: 'NFT Explorer',
        text: `The 3D NFT Explorer provides an immersive way to view your NFT collection:
        1. Click the "NFT Explorer" button in the scene
        2. Navigate through the 3D gallery
        3. Click on NFTs to view details
        4. Import NFTs directly into your main scene
        
        This feature allows you to showcase your 3D creations in a virtual gallery.`
      }
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    content: [
      {
        id: 'ipfs',
        title: 'IPFS Integration',
        text: `VR Genesis Frame uses IPFS (InterPlanetary File System) for decentralized storage of 3D models and metadata.
        When you mint an NFT, the model and metadata are uploaded to IPFS, ensuring permanent storage.
        IPFS CIDs (Content Identifiers) are included in the NFT metadata for future reference.`
      },
      {
        id: 'multi-chain',
        title: 'Multi-Chain Support',
        text: `The platform supports minting NFTs on multiple Polkadot parachains:
        - Unique Network: Specialized NFT parachain
        - Moonbeam: EVM-compatible parachain
        - Astar: Smart contract parachain
        
        Each chain has its own benefits and ecosystem. NFTs can be viewed and managed across all supported chains.`
      },
      {
        id: 'virtual-land',
        title: 'Virtual Land Plots',
        text: `The Plots tab allows you to:
        - Browse available virtual land plots
        - Purchase plots using your connected wallet
        - Place your creations on owned land
        - Build persistent 3D scenes
        
        This feature is currently in beta and will be expanded in future updates.`
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: [
      {
        id: 'performance',
        title: 'Performance Issues',
        text: `If you experience performance issues:
        1. Enable Performance Mode in your profile settings
        2. Reduce the number of objects in your scene
        3. Close other browser tabs and applications
        4. Update your graphics drivers
        5. Try a different browser
        
        Complex scenes with many objects may require a powerful computer.`
      },
      {
        id: 'wallet-issues',
        title: 'Wallet Connection Issues',
        text: `If you have trouble connecting your wallet:
        1. Make sure your wallet extension is installed and up-to-date
        2. Refresh the page and try again
        3. Disconnect and reconnect your wallet
        4. Check that you're on the correct network
        5. Clear browser cache and cookies
        
        For persistent issues, try a different wallet or browser.`
      },
      {
        id: 'vr-support',
        title: 'VR Support Issues',
        text: `If VR mode isn't working:
        1. Ensure your browser supports WebXR (Chrome, Edge latest versions)
        2. Connect your VR headset and make sure it's detected
        3. Try accessing the site on the VR headset's built-in browser
        4. Check that your system meets the requirements for VR
        
        Not all features may be available in VR mode on all devices.`
      }
    ]
  }
];

const Documentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter content based on search query
  const filteredSections = searchQuery ? 
    docSections.map(section => ({
      ...section,
      content: section.content.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(section => section.content.length > 0) : 
    docSections;
  
  // Track page view
  React.useEffect(() => {
    analytics.trackPageView('/documentation', 'VR Genesis Frame Documentation');
  }, []);
  
  // Track section view
  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    analytics.trackEvent(EventType.PAGE_VIEW, {
      page: `/documentation/${sectionId}`,
      section: sectionId
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Home</span>
            </Button>
          </Link>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">
            VR Genesis Frame Documentation
          </h1>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-background/50 p-4 hidden md:block">
          <nav className="space-y-1">
            {docSections.map(section => (
              <button
                key={section.id}
                className={`w-full px-3 py-2 text-left rounded-md transition-colors ${
                  activeSection === section.id 
                    ? 'bg-purple-100 text-purple-700 font-medium'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleSectionClick(section.id)}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <ScrollArea className="h-[calc(100vh-8rem)]">
            {filteredSections.map(section => (
              <div key={section.id} className="mb-12" id={section.id}>
                <h2 className="text-2xl font-bold text-purple-700 mb-6">{section.title}</h2>
                
                <div className="space-y-8">
                  {section.content.map(item => (
                    <div key={item.id} className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                      <p className="text-gray-700 whitespace-pre-line">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {filteredSections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium mb-2">No results found</h3>
                <p className="text-gray-500">
                  No documentation matched your search for "{searchQuery}"
                </p>
                <Button 
                  variant="link" 
                  className="mt-4"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              </div>
            )}
            
            {/* Version info and feedback */}
            <div className="mt-16 border-t pt-6 text-sm text-gray-500">
              <p>VR Genesis Frame v1.0.0 (Final Phase)</p>
              <p className="mt-2">
                Have feedback or questions? <a href="#" className="text-purple-600 hover:underline">Contact us</a> or visit our <a href="#" className="text-purple-600 hover:underline flex items-center gap-1 inline-flex">GitHub repository <ExternalLink className="h-3 w-3" /></a>
              </p>
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
};

export default Documentation; 