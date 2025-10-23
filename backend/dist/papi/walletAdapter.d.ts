import { PAPIClient } from './papiClient';
import { KeyringPair } from '@polkadot/keyring/types';
export declare class WalletAdapter {
    private client;
    private keyring;
    private serverAccount;
    constructor(client: PAPIClient);
    initialize(): Promise<void>;
    getServerAccount(): KeyringPair;
    validateAddress(address: string): boolean;
}
//# sourceMappingURL=walletAdapter.d.ts.map