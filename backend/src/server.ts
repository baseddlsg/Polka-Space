import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mintNft } from './polkadotService'; // Uncommented and implemented
import { checkAddress } from '@polkadot/util-crypto';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3001; // Default to 3001 if PORT not set

// --- Middleware ---
// Enable CORS for all origins
app.use(cors());
// Parse JSON request bodies
app.use(express.json());

// In-memory metadata store: { [collectionId_itemId]: metadata }
const nftMetadataStore: Record<string, any> = {};

// Define the async logic separately
async function handleMintRequest(req: Request, res: Response): Promise<void> {
  console.log('Received mint request:', req.body);
  const { ownerAddress, metadata } = req.body;

  if (!ownerAddress) {
    res.status(400).json({ message: 'Missing ownerAddress in request body' });
    return;
  }

  // Validate address (Westmint/Polkadot, 42 is the generic Substrate prefix)
  try {
    const [isValid] = checkAddress(ownerAddress, 42);
    if (!isValid) {
      res.status(400).json({ message: 'Invalid ownerAddress format' });
      return;
    }
  } catch (e) {
    res.status(400).json({ message: 'Invalid ownerAddress format' });
    return;
  }

  try {
    console.log(`Initiating mint for ${ownerAddress}`);
    // Pass metadata to mintNft (update signature to accept it)
    const { txHash, collectionId, itemId } = await mintNft(ownerAddress, metadata);
    // Store metadata in-memory
    const key = `${collectionId}_${itemId}`;
    nftMetadataStore[key] = metadata;
    console.log(`Mint successful for ${ownerAddress}, txHash: ${txHash}`);
    res.json({ transactionHash: txHash, collectionId, itemId, metadata });
  } catch (error) {
    console.error('Minting API call failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: 'Minting failed', error: errorMessage });
  }
}

// --- Routes ---
// Root route for health check
app.get('/', (req: Request, res: Response) => {
  res.send('Backend Online');
});

// POST route using the handler and catching errors
app.post('/api/mint', (req: Request, res: Response) => {
  handleMintRequest(req, res).catch(err => {
    // Catch any unexpected errors from the async handler itself
    console.error("Unhandled error in mint request handler:", err);
    if (!res.headersSent) { // Avoid sending response if one was already sent
        res.status(500).json({ message: 'Internal server error' });
    }
  });
});

// Add endpoint to fetch metadata for a given NFT
app.get('/api/nft/:collectionId/:itemId', (req: Request, res: Response) => {
  const { collectionId, itemId } = req.params;
  const key = `${collectionId}_${itemId}`;
  const metadata = nftMetadataStore[key];
  if (metadata) {
    res.json({ metadata });
  } else {
    res.status(404).json({ message: 'Metadata not found' });
  }
});

// List all NFTs in a collection
app.get('/api/nfts/:collectionId', (req: Request, res: Response) => {
  const { collectionId } = req.params;
  const nfts = Object.entries(nftMetadataStore)
    .filter(([key]) => key.startsWith(`${collectionId}_`))
    .map(([key, metadata]) => {
      const itemId = key.split('_')[1];
      return { itemId, metadata };
    });
  res.json({ nfts });
});

// --- Server Start ---
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
}); 