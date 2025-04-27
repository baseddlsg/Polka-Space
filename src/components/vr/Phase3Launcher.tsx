import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const Phase3Launcher: React.FC = () => {
  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
      <div className="space-y-4">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
            Phase 3 Features
          </h2>
        </div>
        
        <p className="text-gray-600 text-sm">
          Welcome to Phase 3 of VR Genesis Frame! Explore our new blockchain features and NFT integration.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card className="overflow-hidden border-purple-100">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
            <CardContent className="p-4">
              <h3 className="font-medium text-purple-700 mb-2">NFT Explorer</h3>
              <p className="text-sm text-gray-600 mb-3">
                Explore your NFT collection in immersive 3D. View and import your NFTs directly into the scene.
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs border-purple-200 text-purple-600 hover:bg-purple-50"
                onClick={() => {
                  // Redirect to VR world with explorer mode active
                  window.location.href = '/vr?explorer=true';
                }}
              >
                Launch Explorer
              </Button>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-purple-100">
            <div className="h-2 bg-gradient-to-r from-pink-500 to-rose-500"></div>
            <CardContent className="p-4">
              <h3 className="font-medium text-purple-700 mb-2">Multi-Chain Minting</h3>
              <p className="text-sm text-gray-600 mb-3">
                Mint your 3D creations as NFTs on multiple blockchain networks including Unique, Moonbeam, and Astar.
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs border-purple-200 text-purple-600 hover:bg-purple-50"
                onClick={() => {
                  // Redirect to VR world with minting tab open
                  window.location.href = '/vr?tab=nft-gallery';
                }}
              >
                Try Minting
              </Button>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-purple-100">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            <CardContent className="p-4">
              <h3 className="font-medium text-purple-700 mb-2">IPFS Integration</h3>
              <p className="text-sm text-gray-600 mb-3">
                Store and retrieve 3D models and metadata using decentralized IPFS protocol.
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs border-purple-200 text-purple-600 hover:bg-purple-50"
                asChild
              >
                <Link to="/vr">Try It Out</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-purple-100">
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <CardContent className="p-4">
              <h3 className="font-medium text-purple-700 mb-2">Documentation</h3>
              <p className="text-sm text-gray-600 mb-3">
                Learn about Phase 3 features and how to use them in your VR experiences.
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs border-purple-200 text-purple-600 hover:bg-purple-50"
                asChild
              >
                <Link to="#">Read Documentation</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Phase3Launcher; 