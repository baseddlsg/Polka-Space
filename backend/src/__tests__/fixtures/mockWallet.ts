import { KeyringPair } from '@polkadot/keyring/types';
import { testnetAccountManager } from '../../config/testnet';

export interface MockWalletAccount {
  address: string;
  name: string;
  keyringPair: KeyringPair;
  balance: number;
}

export class MockWalletProvider {
  private accounts: MockWalletAccount[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await testnetAccountManager.initialize();
    const testAccounts = testnetAccountManager.getAllTestAccounts();

    this.accounts = [
      {
        address: testAccounts.server.address,
        name: 'Test Server Account',
        keyringPair: testAccounts.server,
        balance: 1000000000000, // 1 DOT in planck
      },
      {
        address: testAccounts.testUser.address,
        name: 'Test User Account',
        keyringPair: testAccounts.testUser,
        balance: 500000000000, // 0.5 DOT in planck
      },
      {
        address: testAccounts.testCreator.address,
        name: 'Test Creator Account',
        keyringPair: testAccounts.testCreator,
        balance: 750000000000, // 0.75 DOT in planck
      },
    ];

    this.initialized = true;
  }

  getAccounts(): MockWalletAccount[] {
    if (!this.initialized) throw new Error('MockWalletProvider not initialized');
    return this.accounts;
  }

  getAccountByAddress(address: string): MockWalletAccount | undefined {
    return this.accounts.find(account => account.address === address);
  }

  getServerAccount(): MockWalletAccount {
    const account = this.accounts.find(acc => acc.name === 'Test Server Account');
    if (!account) throw new Error('Server account not found');
    return account;
  }

  getTestUserAccount(): MockWalletAccount {
    const account = this.accounts.find(acc => acc.name === 'Test User Account');
    if (!account) throw new Error('Test user account not found');
    return account;
  }

  getTestCreatorAccount(): MockWalletAccount {
    const account = this.accounts.find(acc => acc.name === 'Test Creator Account');
    if (!account) throw new Error('Test creator account not found');
    return account;
  }

  // Simulate wallet connection
  async connectWallet(accountName: string): Promise<MockWalletAccount> {
    const account = this.accounts.find(acc => acc.name === accountName);
    if (!account) {
      throw new Error(`Account ${accountName} not found`);
    }
    return account;
  }

  // Simulate transaction signing
  async signTransaction(account: MockWalletAccount, transactionData: any): Promise<string> {
    // Simulate signing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return mock signature
    return `0x${Math.random().toString(16).substr(2, 64)}`;
  }

  // Update account balance (for testing purposes)
  updateBalance(address: string, newBalance: number): void {
    const account = this.getAccountByAddress(address);
    if (account) {
      account.balance = newBalance;
    }
  }
}

export const mockWalletProvider = new MockWalletProvider();

// Mock wallet extension for frontend testing
export const mockWalletExtension = {
  name: 'polkadot-js',
  version: '0.44.1',
  accounts: {
    get: async () => {
      await mockWalletProvider.initialize();
      return mockWalletProvider.getAccounts().map(account => ({
        address: account.address,
        meta: {
          name: account.name,
          source: 'polkadot-js',
        },
      }));
    },
  },
  signer: {
    signPayload: async (payload: any) => {
      // Mock signing
      return {
        id: payload.id,
        signature: `0x${Math.random().toString(16).substr(2, 128)}`,
      };
    },
  },
};

// Helper function to create mock wallet context
export function createMockWalletContext() {
  return {
    account: null,
    accounts: [],
    isConnected: false,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    selectAccount: jest.fn(),
  };
}