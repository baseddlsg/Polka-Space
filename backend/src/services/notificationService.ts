import { MintTransaction } from '../types/nft';

export interface NotificationChannel {
  type: 'webhook' | 'websocket' | 'email';
  endpoint?: string;
  enabled: boolean;
}

export class NotificationService {
  private channels: Map<string, NotificationChannel[]> = new Map();
  private webhookEndpoints: string[] = [];

  /**
   * Register notification channels for a wallet address
   */
  registerChannels(walletAddress: string, channels: NotificationChannel[]): void {
    this.channels.set(walletAddress, channels);
    console.log(`Registered ${channels.length} notification channels for ${walletAddress}`);
  }

  /**
   * Add global webhook endpoint for notifications
   */
  addWebhookEndpoint(endpoint: string): void {
    if (!this.webhookEndpoints.includes(endpoint)) {
      this.webhookEndpoints.push(endpoint);
      console.log(`Added webhook endpoint: ${endpoint}`);
    }
  }

  /**
   * Notify when mint transaction is completed
   */
  async notifyMintCompletion(
    transactionId: string, 
    mintResult: { txHash: string; collectionId: number; itemId: number }
  ): Promise<void> {
    const notification = {
      type: 'mint_completed',
      transactionId,
      txHash: mintResult.txHash,
      collectionId: mintResult.collectionId,
      itemId: mintResult.itemId,
      timestamp: Date.now()
    };

    console.log(`Mint completed notification for transaction ${transactionId}`);
    
    // Send to global webhooks
    await this.sendWebhookNotifications(notification);
    
    // Log notification (in production, this could be sent to monitoring systems)
    console.log('Mint completion notification:', notification);
  }

  /**
   * Notify when transaction fails
   */
  async notifyMintFailure(
    transactionId: string, 
    walletAddress: string, 
    error: string
  ): Promise<void> {
    const notification = {
      type: 'mint_failed',
      transactionId,
      walletAddress,
      error,
      timestamp: Date.now()
    };

    console.log(`Mint failed notification for transaction ${transactionId}: ${error}`);
    
    // Send to registered channels for this wallet
    const channels = this.channels.get(walletAddress) || [];
    await this.sendToChannels(channels, notification);
    
    // Send to global webhooks
    await this.sendWebhookNotifications(notification);
  }

  /**
   * Notify about transaction status updates
   */
  async notifyStatusUpdate(transaction: MintTransaction): Promise<void> {
    const notification = {
      type: 'status_update',
      transactionId: transaction.id,
      status: transaction.status,
      walletAddress: transaction.walletAddress,
      timestamp: Date.now()
    };

    console.log(`Status update notification: ${transaction.id} -> ${transaction.status}`);
    
    // Send to registered channels for this wallet
    const channels = this.channels.get(transaction.walletAddress) || [];
    await this.sendToChannels(channels, notification);
  }

  /**
   * Send notifications to specific channels
   */
  private async sendToChannels(channels: NotificationChannel[], notification: any): Promise<void> {
    for (const channel of channels.filter(c => c.enabled)) {
      try {
        switch (channel.type) {
          case 'webhook':
            if (channel.endpoint) {
              await this.sendWebhook(channel.endpoint, notification);
            }
            break;
          case 'websocket':
            // WebSocket implementation would go here
            console.log(`WebSocket notification sent to ${channel.endpoint}`);
            break;
          case 'email':
            // Email implementation would go here
            console.log(`Email notification sent to ${channel.endpoint}`);
            break;
        }
      } catch (error) {
        console.error(`Failed to send notification via ${channel.type}:`, error);
      }
    }
  }

  /**
   * Send webhook notifications to global endpoints
   */
  private async sendWebhookNotifications(notification: any): Promise<void> {
    for (const endpoint of this.webhookEndpoints) {
      try {
        await this.sendWebhook(endpoint, notification);
      } catch (error) {
        console.error(`Failed to send webhook to ${endpoint}:`, error);
      }
    }
  }

  /**
   * Send HTTP webhook notification
   */
  private async sendWebhook(endpoint: string, notification: any): Promise<void> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      console.log(`Webhook sent successfully to ${endpoint}`);
    } catch (error) {
      console.error(`Webhook failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  getStats(): {
    registeredWallets: number;
    totalChannels: number;
    webhookEndpoints: number;
  } {
    const totalChannels = Array.from(this.channels.values())
      .reduce((sum, channels) => sum + channels.length, 0);

    return {
      registeredWallets: this.channels.size,
      totalChannels,
      webhookEndpoints: this.webhookEndpoints.length
    };
  }

  /**
   * Remove notification channels for a wallet
   */
  removeChannels(walletAddress: string): boolean {
    return this.channels.delete(walletAddress);
  }

  /**
   * Remove webhook endpoint
   */
  removeWebhookEndpoint(endpoint: string): boolean {
    const index = this.webhookEndpoints.indexOf(endpoint);
    if (index > -1) {
      this.webhookEndpoints.splice(index, 1);
      console.log(`Removed webhook endpoint: ${endpoint}`);
      return true;
    }
    return false;
  }
}