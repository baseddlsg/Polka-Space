import dotenv from 'dotenv';

dotenv.config();

export interface PAPIConfig {
  nft: {
    collectionId: number;
  };
  endpoints: {
    assetHub: string;
  };
  server: {
    accountSeed?: string;
  };
}

export const PAPI_CONFIG: PAPIConfig = {
  nft: {
    collectionId: parseInt(process.env.NFT_COLLECTION_ID || '1'),
  },
  endpoints: {
    assetHub: process.env.ASSETHUB_ENDPOINT_URL || process.env.STATEMINT_ENDPOINT_URL || 'wss://statemint-rpc.polkadot.io',
  },
  server: {
    accountSeed: process.env.SERVER_ACCOUNT_SEED,
  },
};

export function validateConfig(): void {
  if (!PAPI_CONFIG.endpoints.assetHub) {
    throw new Error('ASSETHUB_ENDPOINT_URL or STATEMINT_ENDPOINT_URL must be defined in environment variables');
  }
  
  if (!PAPI_CONFIG.server.accountSeed) {
    console.warn('SERVER_ACCOUNT_SEED not defined - minting functionality will be limited');
  }
  
  if (isNaN(PAPI_CONFIG.nft.collectionId)) {
    throw new Error('NFT_COLLECTION_ID must be a valid number');
  }
}