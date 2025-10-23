import { PAPIClient } from './papiClient';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';

export class WalletAdapter {
  private client: PAPIClient;
  private keyring: Keyring;
  private serverAccount: KeyringPair | null = null;

  constructor(client: PAPIClient) {
    this.client = client;
    this.keyring = new Keyring({ type: 'sr25519' });
  }

  async initialize(): Promise<void> {
    await cryptoWaitReady();
    
    const serverSeed = process.env.SERVER_ACCOUNT_SEED;
    if (serverSeed) {
      this.serverAccount = this.keyring.addFromUri(serverSeed);
      console.log('Server account loaded:', this.serverAccount.address);
    }
  }

  getServerAccount(): KeyringPair {
    if (!this.serverAccount) {
      throw new Error('Server account not initialized');
    }
    return this.serverAccount;
  }

  validateAddress(address: string): boolean {
    try {
      this.keyring.encodeAddress(this.keyring.decodeAddress(address));
      return true;
    } catch {
      return false;
    }
  }
}