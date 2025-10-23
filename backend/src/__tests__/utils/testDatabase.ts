import { Redis } from 'ioredis';
import { TESTNET_CONFIG } from '../../config/testnet';
import { mockNFTMetadata, mockUserPortfolios, mockMintTransactions } from '../fixtures/mockNFTData';

export class TestDatabase {
  private redis: Redis;
  private initialized = false;

  constructor() {
    this.redis = new Redis(TESTNET_CONFIG.redis.url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.redis.connect();
      await this.clearTestData();
      await this.seedTestData();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize test database:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (!this.initialized) return;

    try {
      await this.clearTestData();
      await this.redis.disconnect();
      this.initialized = false;
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
    }
  }

  private async clearTestData(): Promise<void> {
    const keys = await this.redis.keys('test:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private async seedTestData(): Promise<void> {
    // Seed NFT metadata
    for (const nft of mockNFTMetadata) {
      await this.redis.hset(`test:nft:${nft.id}`, {
        metadata: JSON.stringify(nft),
        creator: nft.creator,
        timestamp: nft.timestamp.toString(),
      });
    }

    // Seed user portfolios
    for (const portfolio of mockUserPortfolios) {
      await this.redis.hset(`test:portfolio:${portfolio.walletAddress}`, {
        nfts: JSON.stringify(portfolio.nfts),
        totalValue: portfolio.totalValue.toString(),
        createdCount: portfolio.createdCount.toString(),
        lastUpdated: portfolio.lastUpdated.toString(),
      });
    }

    // Seed mint transactions
    for (const transaction of mockMintTransactions) {
      await this.redis.hset(`test:mint:${transaction.id}`, {
        status: transaction.status,
        metadata: JSON.stringify(transaction.metadata),
        walletAddress: transaction.walletAddress,
        transactionHash: transaction.transactionHash || '',
        blockNumber: transaction.blockNumber?.toString() || '',
        error: transaction.error || '',
        createdAt: transaction.createdAt.toString(),
        updatedAt: transaction.updatedAt.toString(),
      });
    }

    // Create indexes for efficient querying
    await this.createTestIndexes();
  }

  private async createTestIndexes(): Promise<void> {
    // Index NFTs by creator
    for (const nft of mockNFTMetadata) {
      await this.redis.sadd(`test:creator:${nft.creator}:nfts`, nft.id);
    }

    // Index recent mints
    const recentMints = mockNFTMetadata
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
    
    for (const nft of recentMints) {
      await this.redis.zadd('test:recent:mints', nft.timestamp, nft.id);
    }

    // Index pending transactions
    const pendingTxs = mockMintTransactions.filter(tx => tx.status === 'pending');
    for (const tx of pendingTxs) {
      await this.redis.sadd('test:pending:mints', tx.id);
    }
  }

  // Helper methods for test data access
  async getNFTById(id: string): Promise<any> {
    const data = await this.redis.hgetall(`test:nft:${id}`);
    if (!data.metadata) return null;
    
    return {
      ...JSON.parse(data.metadata),
      creator: data.creator,
      timestamp: parseInt(data.timestamp),
    };
  }

  async getPortfolioByAddress(address: string): Promise<any> {
    const data = await this.redis.hgetall(`test:portfolio:${address}`);
    if (!data.nfts) return null;
    
    return {
      walletAddress: address,
      nfts: JSON.parse(data.nfts),
      totalValue: parseInt(data.totalValue),
      createdCount: parseInt(data.createdCount),
      lastUpdated: parseInt(data.lastUpdated),
    };
  }

  async getMintTransactionById(id: string): Promise<any> {
    const data = await this.redis.hgetall(`test:mint:${id}`);
    if (!data.status) return null;
    
    return {
      id,
      status: data.status,
      metadata: JSON.parse(data.metadata),
      walletAddress: data.walletAddress,
      transactionHash: data.transactionHash || undefined,
      blockNumber: data.blockNumber ? parseInt(data.blockNumber) : undefined,
      error: data.error || undefined,
      createdAt: parseInt(data.createdAt),
      updatedAt: parseInt(data.updatedAt),
    };
  }

  async addTestNFT(nft: any): Promise<void> {
    await this.redis.hset(`test:nft:${nft.id}`, {
      metadata: JSON.stringify(nft),
      creator: nft.creator,
      timestamp: nft.timestamp.toString(),
    });
    
    await this.redis.sadd(`test:creator:${nft.creator}:nfts`, nft.id);
    await this.redis.zadd('test:recent:mints', nft.timestamp, nft.id);
  }

  async addTestMintTransaction(transaction: any): Promise<void> {
    await this.redis.hset(`test:mint:${transaction.id}`, {
      status: transaction.status,
      metadata: JSON.stringify(transaction.metadata),
      walletAddress: transaction.walletAddress,
      transactionHash: transaction.transactionHash || '',
      blockNumber: transaction.blockNumber?.toString() || '',
      error: transaction.error || '',
      createdAt: transaction.createdAt.toString(),
      updatedAt: transaction.updatedAt.toString(),
    });
    
    if (transaction.status === 'pending') {
      await this.redis.sadd('test:pending:mints', transaction.id);
    }
  }

  getRedisClient(): Redis {
    return this.redis;
  }
}

export const testDatabase = new TestDatabase();