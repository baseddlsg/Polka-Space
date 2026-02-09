import request from 'supertest';
import { Express } from 'express';
import { mockWalletProvider, MockWalletAccount } from '../fixtures/mockWallet';
import { testDatabase } from './testDatabase';
import { generateRandomNFTMetadata, generateRandomMintTransaction } from '../fixtures/mockNFTData';
import { sampleModels, createMockFormData } from '../fixtures/sample3DModels';

export class TestHelpers {
  private app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  // Authentication helpers
  async getAuthenticatedRequest(accountType: 'server' | 'testUser' | 'testCreator' = 'testUser') {
    await mockWalletProvider.initialize();
    
    let account: MockWalletAccount;
    switch (accountType) {
      case 'server':
        account = mockWalletProvider.getServerAccount();
        break;
      case 'testCreator':
        account = mockWalletProvider.getTestCreatorAccount();
        break;
      default:
        account = mockWalletProvider.getTestUserAccount();
    }

    return request(this.app)
      .post('/auth/connect')
      .send({ address: account.address })
      .expect(200)
      .then(response => ({
        token: response.body.token,
        account,
        request: (method: string, path: string) => 
          (request(this.app) as any)[method](path)
            .set('Authorization', `Bearer ${response.body.token}`)
      }));
  }

  // NFT minting helpers
  async mintTestNFT(accountType: 'server' | 'testUser' | 'testCreator' = 'testUser', modelIndex = 0) {
    const auth = await this.getAuthenticatedRequest(accountType);
    const model = sampleModels[modelIndex];
    const formData = createMockFormData(model, {
      name: `Test NFT ${Date.now()}`,
      description: 'A test NFT for automated testing',
    });

    return auth.request('post', '/api/mint')
      .send(formData)
      .expect(201);
  }

  // Portfolio helpers
  async getTestPortfolio(accountType: 'server' | 'testUser' | 'testCreator' = 'testUser') {
    const auth = await this.getAuthenticatedRequest(accountType);
    
    return auth.request('get', `/api/portfolio/${auth.account.address}`)
      .expect(200);
  }

  // Community helpers
  async getCommunityFeed() {
    return request(this.app)
      .get('/api/community')
      .expect(200);
  }

  // Database helpers
  async seedTestNFT(overrides = {}) {
    const nft = generateRandomNFTMetadata(overrides);
    await testDatabase.addTestNFT(nft);
    return nft;
  }

  async seedTestMintTransaction(overrides = {}) {
    const transaction = generateRandomMintTransaction(overrides);
    await testDatabase.addTestMintTransaction(transaction);
    return transaction;
  }

  async clearTestData() {
    await testDatabase.cleanup();
    await testDatabase.initialize();
  }

  // Blockchain simulation helpers
  simulateBlockchainDelay(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async simulateMintingProcess(accountType: 'server' | 'testUser' | 'testCreator' = 'testUser') {
    // Start minting
    const mintResponse = await this.mintTestNFT(accountType);
    const transactionId = mintResponse.body.transactionId;

    // Simulate blockchain processing delay
    await this.simulateBlockchainDelay(500);

    // Check transaction status
    const statusResponse = await request(this.app)
      .get(`/api/mint/status/${transactionId}`)
      .expect(200);

    return {
      mintResponse,
      statusResponse,
      transactionId,
    };
  }

  // Performance testing helpers
  async measureResponseTime(method: string, path: string, expectedStatus = 200) {
    const startTime = Date.now();
    
    const response = await (request(this.app) as any)[method](path)
      .expect(expectedStatus);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      response,
      responseTime,
      isWithinThreshold: (threshold: number) => responseTime <= threshold,
    };
  }

  async loadTest(method: string, path: string, concurrentRequests = 10, expectedStatus = 200) {
    const promises = Array(concurrentRequests).fill(null).map(() =>
      this.measureResponseTime(method, path, expectedStatus)
    );

    const results = await Promise.all(promises);
    const responseTimes = results.map(r => r.responseTime);
    
    return {
      results,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      allWithinThreshold: (threshold: number) => results.every(r => r.isWithinThreshold(threshold)),
    };
  }

  // Error simulation helpers
  async simulateNetworkError() {
    // Mock network failure
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    return () => {
      global.fetch = originalFetch;
    };
  }

  async simulateBlockchainError() {
    // This would be implemented based on the specific blockchain client being used
    // For now, we'll simulate by temporarily changing the endpoint
    const originalEndpoint = process.env.ASSETHUB_ENDPOINT_URL;
    process.env.ASSETHUB_ENDPOINT_URL = 'wss://invalid-endpoint.example.com';
    
    return () => {
      process.env.ASSETHUB_ENDPOINT_URL = originalEndpoint;
    };
  }

  // Validation helpers
  validateNFTMetadata(metadata: any) {
    expect(metadata).toHaveProperty('id');
    expect(metadata).toHaveProperty('name');
    expect(metadata).toHaveProperty('description');
    expect(metadata).toHaveProperty('model');
    expect(metadata).toHaveProperty('creator');
    expect(metadata).toHaveProperty('timestamp');
    
    expect(metadata.model).toHaveProperty('url');
    expect(metadata.model).toHaveProperty('format');
    expect(metadata.model).toHaveProperty('size');
    expect(metadata.model).toHaveProperty('dimensions');
  }

  validateMintTransaction(transaction: any) {
    expect(transaction).toHaveProperty('id');
    expect(transaction).toHaveProperty('status');
    expect(transaction).toHaveProperty('metadata');
    expect(transaction).toHaveProperty('walletAddress');
    expect(transaction).toHaveProperty('createdAt');
    expect(transaction).toHaveProperty('updatedAt');
    
    expect(['pending', 'processing', 'completed', 'failed']).toContain(transaction.status);
  }

  validatePortfolio(portfolio: any) {
    expect(portfolio).toHaveProperty('walletAddress');
    expect(portfolio).toHaveProperty('nfts');
    expect(portfolio).toHaveProperty('totalValue');
    expect(portfolio).toHaveProperty('createdCount');
    expect(portfolio).toHaveProperty('lastUpdated');
    
    expect(Array.isArray(portfolio.nfts)).toBe(true);
    expect(typeof portfolio.totalValue).toBe('number');
    expect(typeof portfolio.createdCount).toBe('number');
  }
}

// Export singleton instance
export function createTestHelpers(app: Express): TestHelpers {
  return new TestHelpers(app);
}