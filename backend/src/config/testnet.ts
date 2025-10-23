import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';

export interface TestnetConfig {
  endpoints: {
    assetHub: string;
  };
  accounts: {
    server: string;
    testUser: string;
    testCreator: string;
  };
  nft: {
    collectionId: number;
  };
  redis: {
    url: string;
    testDb: number;
  };
}

export const TESTNET_CONFIG: TestnetConfig = {
  endpoints: {
    assetHub: process.env.ASSETHUB_ENDPOINT_URL || 'wss://westmint-rpc.polkadot.io',
  },
  accounts: {
    server: process.env.SERVER_ACCOUNT_SEED || '//Alice',
    testUser: process.env.TEST_ACCOUNT_SEED || '//Bob',
    testCreator: process.env.TEST_CREATOR_SEED || '//Charlie',
  },
  nft: {
    collectionId: parseInt(process.env.NFT_COLLECTION_ID || '1'),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379/1',
    testDb: 1,
  },
};

export class TestnetAccountManager {
  private keyring: Keyring;
  private initialized = false;

  constructor() {
    this.keyring = new Keyring({ type: 'sr25519' });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await cryptoWaitReady();
    this.initialized = true;
  }

  getServerAccount() {
    if (!this.initialized) throw new Error('AccountManager not initialized');
    return this.keyring.addFromUri(TESTNET_CONFIG.accounts.server);
  }

  getTestUserAccount() {
    if (!this.initialized) throw new Error('AccountManager not initialized');
    return this.keyring.addFromUri(TESTNET_CONFIG.accounts.testUser);
  }

  getTestCreatorAccount() {
    if (!this.initialized) throw new Error('AccountManager not initialized');
    return this.keyring.addFromUri(TESTNET_CONFIG.accounts.testCreator);
  }

  getAllTestAccounts() {
    return {
      server: this.getServerAccount(),
      testUser: this.getTestUserAccount(),
      testCreator: this.getTestCreatorAccount(),
    };
  }
}

export const testnetAccountManager = new TestnetAccountManager();