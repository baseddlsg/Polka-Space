"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeApi = initializeApi;
exports.mintNft = mintNft;
const api_1 = require("@polkadot/api");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let api = null;
let serverAccount = null;
async function initializeApi() {
    if (api) {
        return api;
    }
    const endpoint = process.env.STATEMINT_ENDPOINT_URL;
    if (!endpoint) {
        throw new Error('STATEMINT_ENDPOINT_URL is not defined in .env file');
    }
    const provider = new api_1.WsProvider(endpoint);
    console.log(`Connecting to Statemint/Westmint node at ${endpoint}...`);
    try {
        api = await api_1.ApiPromise.create({ provider });
        await api.isReady;
        console.log('API connected and ready.');
        const serverSeed = process.env.SERVER_ACCOUNT_SEED;
        if (!serverSeed) {
            throw new Error('SERVER_ACCOUNT_SEED is not defined in .env file');
        }
        const keyring = new api_1.Keyring({ type: 'sr25519' });
        serverAccount = keyring.addFromUri(serverSeed);
        console.log('Server account loaded:', serverAccount.address);
        return api;
    }
    catch (error) {
        console.error('Failed to initialize Polkadot API:', error);
        api = null;
        serverAccount = null;
        throw error;
    }
}
async function getNextAvailableItemId(api, collectionId) {
    let itemId = 0;
    while (true) {
        const item = await api.query.nfts.item(collectionId, itemId);
        if (item.isNone || item.isEmpty || item === null) {
            return itemId;
        }
        itemId++;
        if (itemId > 2 ** 32 - 1)
            throw new Error('No available itemId found');
    }
}
async function mintNft(ownerAddress, metadata) {
    console.log(`Attempting to mint NFT for owner: ${ownerAddress}`);
    try {
        console.log('Using legacy Polkadot.js API for minting');
        const currentApi = await initializeApi();
        if (!serverAccount) {
            throw new Error('Server account not initialized. Make sure initializeApi() was called successfully.');
        }
        const collectionIdStr = process.env.NFT_COLLECTION_ID;
        if (!collectionIdStr) {
            throw new Error('NFT_COLLECTION_ID is not defined in .env file');
        }
        const collectionId = parseInt(collectionIdStr, 10);
        if (isNaN(collectionId)) {
            throw new Error('Invalid NFT_COLLECTION_ID in .env file');
        }
        const itemId = await getNextAvailableItemId(currentApi, collectionId);
        console.log(`Minting NFT: Collection=${collectionId}, Item=${itemId}, Owner=${ownerAddress}`);
        const tx = currentApi.tx.nfts.mint(collectionId, itemId, ownerAddress, null);
        console.log('Signing and sending mint transaction...');
        const hash = await tx.signAndSend(serverAccount);
        const txHashHex = hash.toHex();
        console.log('Mint transaction sent with hash:', txHashHex);
        return { txHash: txHashHex, collectionId, itemId };
    }
    catch (error) {
        console.error('Minting failed:', error);
        if (error instanceof Error) {
            throw new Error(`Minting failed: ${error.message}`);
        }
        else {
            throw new Error('Minting failed due to an unknown error.');
        }
    }
}
//# sourceMappingURL=polkadotService.js.map