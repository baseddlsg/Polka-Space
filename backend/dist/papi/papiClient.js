"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAPIClient = void 0;
exports.getAssetHubClient = getAssetHubClient;
exports.initializePAPIClients = initializePAPIClients;
exports.cleanupPAPIClients = cleanupPAPIClients;
const polkadot_api_1 = require("polkadot-api");
const ws_provider_1 = require("@polkadot-api/ws-provider");
const polkadot_sdk_compat_1 = require("polkadot-api/polkadot-sdk-compat");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class PAPIClient {
    constructor(config) {
        this.client = null;
        this.provider = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.config = {
            reconnectAttempts: 5,
            reconnectDelay: 2000,
            ...config
        };
    }
    async connect() {
        if (this.isConnected && this.client) {
            return;
        }
        try {
            console.log(`Connecting to ${this.config.chainName} at ${this.config.endpoint}...`);
            this.provider = (0, ws_provider_1.getWsProvider)(this.config.endpoint);
            this.client = (0, polkadot_api_1.createClient)((0, polkadot_sdk_compat_1.withPolkadotSdkCompat)(this.provider));
            await this.waitForConnection();
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log(`Successfully connected to ${this.config.chainName}`);
            this.setupConnectionMonitoring();
        }
        catch (error) {
            console.error(`Failed to connect to ${this.config.chainName}:`, error);
            await this.handleConnectionError(error);
        }
    }
    async waitForConnection() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Connection timeout after 30 seconds`));
            }, 30000);
            const checkConnection = () => {
                try {
                    if (this.client && this.provider) {
                        clearTimeout(timeout);
                        resolve();
                    }
                    else {
                        setTimeout(checkConnection, 100);
                    }
                }
                catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            };
            checkConnection();
        });
    }
    setupConnectionMonitoring() {
        if (!this.provider)
            return;
        this.provider.on?.('connected', () => {
            console.log(`${this.config.chainName} provider connected`);
            this.isConnected = true;
            this.reconnectAttempts = 0;
        });
        this.provider.on?.('disconnected', () => {
            console.log(`${this.config.chainName} provider disconnected`);
            this.isConnected = false;
            this.attemptReconnection();
        });
        this.provider.on?.('error', (error) => {
            console.error(`${this.config.chainName} provider error:`, error);
            this.isConnected = false;
            this.attemptReconnection();
        });
    }
    async handleConnectionError(error) {
        this.isConnected = false;
        if (this.reconnectAttempts < (this.config.reconnectAttempts || 5)) {
            this.reconnectAttempts++;
            console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts} in ${this.config.reconnectDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay || 2000));
            try {
                await this.connect();
            }
            catch (retryError) {
                console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, retryError);
                if (this.reconnectAttempts >= (this.config.reconnectAttempts || 5)) {
                    throw new Error(`Failed to connect after ${this.reconnectAttempts} attempts: ${error.message}`);
                }
            }
        }
        else {
            throw error;
        }
    }
    async attemptReconnection() {
        if (this.reconnectAttempts >= (this.config.reconnectAttempts || 5)) {
            console.error(`Max reconnection attempts reached for ${this.config.chainName}`);
            return;
        }
        try {
            await this.connect();
        }
        catch (error) {
            console.error(`Reconnection failed for ${this.config.chainName}:`, error);
        }
    }
    getClient() {
        if (!this.isConnected || !this.client) {
            throw new Error(`${this.config.chainName} client is not connected. Call connect() first.`);
        }
        return this.client;
    }
    isClientConnected() {
        return this.isConnected && !!this.client;
    }
    async disconnect() {
        if (this.provider) {
            try {
                await this.provider.disconnect?.();
            }
            catch (error) {
                console.error(`Error disconnecting ${this.config.chainName} provider:`, error);
            }
        }
        this.client = null;
        this.provider = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        console.log(`Disconnected from ${this.config.chainName}`);
    }
    async getChainInfo() {
        const client = this.getClient();
        try {
            const [chainName, chainVersion, properties] = await Promise.all([
                client.constants.System.Version.spec_name(),
                client.constants.System.Version.spec_version(),
                client.constants.System.Properties()
            ]);
            return {
                name: chainName,
                version: chainVersion,
                properties: properties,
                endpoint: this.config.endpoint
            };
        }
        catch (error) {
            console.error(`Failed to get chain info for ${this.config.chainName}:`, error);
            throw error;
        }
    }
}
exports.PAPIClient = PAPIClient;
let assetHubClient = null;
async function getAssetHubClient() {
    if (!assetHubClient) {
        const endpoint = process.env.ASSETHUB_ENDPOINT_URL || process.env.STATEMINT_ENDPOINT_URL;
        if (!endpoint) {
            throw new Error('ASSETHUB_ENDPOINT_URL or STATEMINT_ENDPOINT_URL must be defined in environment variables');
        }
        assetHubClient = new PAPIClient({
            endpoint,
            chainName: 'AssetHub',
            reconnectAttempts: 5,
            reconnectDelay: 2000
        });
        await assetHubClient.connect();
    }
    return assetHubClient;
}
async function initializePAPIClients() {
    try {
        console.log('Initializing PAPI clients...');
        await getAssetHubClient();
        console.log('All PAPI clients initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize PAPI clients:', error);
        throw error;
    }
}
async function cleanupPAPIClients() {
    console.log('Cleaning up PAPI clients...');
    if (assetHubClient) {
        await assetHubClient.disconnect();
        assetHubClient = null;
    }
    console.log('PAPI clients cleanup completed');
}
//# sourceMappingURL=papiClient.js.map