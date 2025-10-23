import { createClient } from "polkadot-api";
import { getWsProvider } from "@polkadot-api/ws-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import dotenv from 'dotenv';

dotenv.config();

export interface PAPIClientConfig {
  endpoint: string;
  chainName: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export class PAPIClient {
  private client: any = null;
  private provider: any = null;
  private config: PAPIClientConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;

  constructor(config: PAPIClientConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 2000,
      ...config
    };
  }

  /**
   * Initialize the PAPI client connection
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      console.log(`Connecting to ${this.config.chainName} at ${this.config.endpoint}...`);
      
      // Create WebSocket provider
      this.provider = getWsProvider(this.config.endpoint);
      
      // Create PAPI client with Polkadot SDK compatibility
      this.client = createClient(withPolkadotSdkCompat(this.provider));
      
      // Wait for connection to be ready
      await this.waitForConnection();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log(`Successfully connected to ${this.config.chainName}`);
      
      // Set up connection monitoring
      this.setupConnectionMonitoring();
      
    } catch (error) {
      console.error(`Failed to connect to ${this.config.chainName}:`, error);
      await this.handleConnectionError(error);
    }
  }

  /**
   * Wait for the client connection to be established
   */
  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout after 30 seconds`));
      }, 30000);

      // Check if client is ready
      const checkConnection = () => {
        try {
          if (this.client && this.provider) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      checkConnection();
    });
  }

  /**
   * Set up connection monitoring and auto-reconnection
   */
  private setupConnectionMonitoring(): void {
    if (!this.provider) return;

    // Monitor provider connection status
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

    this.provider.on?.('error', (error: Error) => {
      console.error(`${this.config.chainName} provider error:`, error);
      this.isConnected = false;
      this.attemptReconnection();
    });
  }

  /**
   * Handle connection errors with retry logic
   */
  private async handleConnectionError(error: any): Promise<void> {
    this.isConnected = false;
    
    if (this.reconnectAttempts < (this.config.reconnectAttempts || 5)) {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts} in ${this.config.reconnectDelay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay || 2000));
      
      try {
        await this.connect();
      } catch (retryError) {
        console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, retryError);
        if (this.reconnectAttempts >= (this.config.reconnectAttempts || 5)) {
          throw new Error(`Failed to connect after ${this.reconnectAttempts} attempts: ${error.message}`);
        }
      }
    } else {
      throw error;
    }
  }

  /**
   * Attempt to reconnect when connection is lost
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= (this.config.reconnectAttempts || 5)) {
      console.error(`Max reconnection attempts reached for ${this.config.chainName}`);
      return;
    }

    try {
      await this.connect();
    } catch (error) {
      console.error(`Reconnection failed for ${this.config.chainName}:`, error);
    }
  }

  /**
   * Get the PAPI client instance
   */
  getClient(): any {
    if (!this.isConnected || !this.client) {
      throw new Error(`${this.config.chainName} client is not connected. Call connect() first.`);
    }
    return this.client;
  }

  /**
   * Check if the client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected && !!this.client;
  }

  /**
   * Disconnect the client
   */
  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.disconnect?.();
      } catch (error) {
        console.error(`Error disconnecting ${this.config.chainName} provider:`, error);
      }
    }
    
    this.client = null;
    this.provider = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    
    console.log(`Disconnected from ${this.config.chainName}`);
  }

  /**
   * Get chain information
   */
  async getChainInfo(): Promise<any> {
    const client = this.getClient();
    
    try {
      // Get basic chain information
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
    } catch (error) {
      console.error(`Failed to get chain info for ${this.config.chainName}:`, error);
      throw error;
    }
  }
}

// Singleton instances for different chains
let assetHubClient: PAPIClient | null = null;

/**
 * Get or create AssetHub PAPI client instance
 */
export async function getAssetHubClient(): Promise<PAPIClient> {
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

/**
 * Initialize all PAPI clients
 */
export async function initializePAPIClients(): Promise<void> {
  try {
    console.log('Initializing PAPI clients...');
    
    // Initialize AssetHub client
    await getAssetHubClient();
    
    console.log('All PAPI clients initialized successfully');
  } catch (error) {
    console.error('Failed to initialize PAPI clients:', error);
    throw error;
  }
}

/**
 * Cleanup all PAPI clients
 */
export async function cleanupPAPIClients(): Promise<void> {
  console.log('Cleaning up PAPI clients...');
  
  if (assetHubClient) {
    await assetHubClient.disconnect();
    assetHubClient = null;
  }
  
  console.log('PAPI clients cleanup completed');
}