"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAPI_CONFIG = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.PAPI_CONFIG = {
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
function validateConfig() {
    if (!exports.PAPI_CONFIG.endpoints.assetHub) {
        throw new Error('ASSETHUB_ENDPOINT_URL or STATEMINT_ENDPOINT_URL must be defined in environment variables');
    }
    if (!exports.PAPI_CONFIG.server.accountSeed) {
        console.warn('SERVER_ACCOUNT_SEED not defined - minting functionality will be limited');
    }
    if (isNaN(exports.PAPI_CONFIG.nft.collectionId)) {
        throw new Error('NFT_COLLECTION_ID must be a valid number');
    }
}
//# sourceMappingURL=config.js.map