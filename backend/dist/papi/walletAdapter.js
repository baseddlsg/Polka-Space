"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletAdapter = void 0;
const keyring_1 = require("@polkadot/keyring");
const util_crypto_1 = require("@polkadot/util-crypto");
class WalletAdapter {
    constructor(client) {
        this.serverAccount = null;
        this.client = client;
        this.keyring = new keyring_1.Keyring({ type: 'sr25519' });
    }
    async initialize() {
        await (0, util_crypto_1.cryptoWaitReady)();
        const serverSeed = process.env.SERVER_ACCOUNT_SEED;
        if (serverSeed) {
            this.serverAccount = this.keyring.addFromUri(serverSeed);
            console.log('Server account loaded:', this.serverAccount.address);
        }
    }
    getServerAccount() {
        if (!this.serverAccount) {
            throw new Error('Server account not initialized');
        }
        return this.serverAccount;
    }
    validateAddress(address) {
        try {
            this.keyring.encodeAddress(this.keyring.decodeAddress(address));
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.WalletAdapter = WalletAdapter;
//# sourceMappingURL=walletAdapter.js.map