"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
class NotificationService {
    constructor() {
        this.channels = new Map();
        this.webhookEndpoints = [];
    }
    registerChannels(walletAddress, channels) {
        this.channels.set(walletAddress, channels);
        console.log(`Registered ${channels.length} notification channels for ${walletAddress}`);
    }
    addWebhookEndpoint(endpoint) {
        if (!this.webhookEndpoints.includes(endpoint)) {
            this.webhookEndpoints.push(endpoint);
            console.log(`Added webhook endpoint: ${endpoint}`);
        }
    }
    async notifyMintCompletion(transactionId, mintResult) {
        const notification = {
            type: 'mint_completed',
            transactionId,
            txHash: mintResult.txHash,
            collectionId: mintResult.collectionId,
            itemId: mintResult.itemId,
            timestamp: Date.now()
        };
        console.log(`Mint completed notification for transaction ${transactionId}`);
        await this.sendWebhookNotifications(notification);
        console.log('Mint completion notification:', notification);
    }
    async notifyMintFailure(transactionId, walletAddress, error) {
        const notification = {
            type: 'mint_failed',
            transactionId,
            walletAddress,
            error,
            timestamp: Date.now()
        };
        console.log(`Mint failed notification for transaction ${transactionId}: ${error}`);
        const channels = this.channels.get(walletAddress) || [];
        await this.sendToChannels(channels, notification);
        await this.sendWebhookNotifications(notification);
    }
    async notifyStatusUpdate(transaction) {
        const notification = {
            type: 'status_update',
            transactionId: transaction.id,
            status: transaction.status,
            walletAddress: transaction.walletAddress,
            timestamp: Date.now()
        };
        console.log(`Status update notification: ${transaction.id} -> ${transaction.status}`);
        const channels = this.channels.get(transaction.walletAddress) || [];
        await this.sendToChannels(channels, notification);
    }
    async sendToChannels(channels, notification) {
        for (const channel of channels.filter(c => c.enabled)) {
            try {
                switch (channel.type) {
                    case 'webhook':
                        if (channel.endpoint) {
                            await this.sendWebhook(channel.endpoint, notification);
                        }
                        break;
                    case 'websocket':
                        console.log(`WebSocket notification sent to ${channel.endpoint}`);
                        break;
                    case 'email':
                        console.log(`Email notification sent to ${channel.endpoint}`);
                        break;
                }
            }
            catch (error) {
                console.error(`Failed to send notification via ${channel.type}:`, error);
            }
        }
    }
    async sendWebhookNotifications(notification) {
        for (const endpoint of this.webhookEndpoints) {
            try {
                await this.sendWebhook(endpoint, notification);
            }
            catch (error) {
                console.error(`Failed to send webhook to ${endpoint}:`, error);
            }
        }
    }
    async sendWebhook(endpoint, notification) {
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
        }
        catch (error) {
            console.error(`Webhook failed for ${endpoint}:`, error);
            throw error;
        }
    }
    getStats() {
        const totalChannels = Array.from(this.channels.values())
            .reduce((sum, channels) => sum + channels.length, 0);
        return {
            registeredWallets: this.channels.size,
            totalChannels,
            webhookEndpoints: this.webhookEndpoints.length
        };
    }
    removeChannels(walletAddress) {
        return this.channels.delete(walletAddress);
    }
    removeWebhookEndpoint(endpoint) {
        const index = this.webhookEndpoints.indexOf(endpoint);
        if (index > -1) {
            this.webhookEndpoints.splice(index, 1);
            console.log(`Removed webhook endpoint: ${endpoint}`);
            return true;
        }
        return false;
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notificationService.js.map