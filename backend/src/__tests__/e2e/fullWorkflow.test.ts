import request from 'supertest';
import { Express } from 'express';
import { testDatabase } from '../utils/testDatabase';
import { createTestHelpers } from '../utils/testHelpers';
import { mockWalletProvider } from '../fixtures/mockWallet';
import { sampleModels, createMockFormData } from '../fixtures/sample3DModels';
import { generateRandomNFTMetadata } from '../fixtures/mockNFTData';

describe('Full Workflow E2E Tests', () => {
  let app: Express;
  let testHelpers: ReturnType<typeof createTestHelpers>;

  beforeAll(async () => {
    // Import app after environment is set up
    const { app: testApp } = await import('../../server');
    app = testApp;
    testHelpers = createTestHelpers(app);
    
    await mockWalletProvider.initialize();
    await testDatabase.initialize();
  });

  afterAll(async () => {
    await testDatabase.cleanup();
  });

  beforeEach(async () => {
    await testHelpers.clearTestData();
  });

  describe('Complete Minting Workflow', () => {
    it('should complete full minting workflow from upload to blockchain confirmation', async () => {
      // Step 1: Connect wallet
      const auth = await testHelpers.getAuthenticatedRequest('testUser');
      
      // Step 2: Upload 3D model and mint NFT
      const model = sampleModels[0];
      const formData = createMockFormData(model, {
        name: 'E2E Test NFT',
        description: 'End-to-end test NFT',
        category: 'test',
        style: 'automated',
      });

      const mintResponse = await auth.request('post', '/api/mint')
        .send(formData)
        .expect(201);

      expect(mintResponse.body).toHaveProperty('transactionId');
      expect(mintResponse.body).toHaveProperty('status', 'pending');

      const transactionId = mintResponse.body.transactionId;

      // Step 3: Monitor transaction status
      let attempts = 0;
      let status = 'pending';
      
      while (status !== 'completed' && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const statusResponse = await request(app)
          .get(`/api/mint/status/${transactionId}`)
          .expect(200);

        status = statusResponse.body.status;
        attempts++;

        testHelpers.validateMintTransaction(statusResponse.body);
      }

      expect(status).toBe('completed');

      // Step 4: Verify NFT appears in portfolio
      const portfolioResponse = await auth.request('get', `/api/portfolio/${auth.account.address}`)
        .expect(200);

      expect(portfolioResponse.body.nfts).toHaveLength(1);
      expect(portfolioResponse.body.nfts[0].name).toBe('E2E Test NFT');
      expect(portfolioResponse.body.createdCount).toBe(1);

      testHelpers.validatePortfolio(portfolioResponse.body);

      // Step 5: Verify NFT appears in community feed
      const communityResponse = await request(app)
        .get('/api/community')
        .expect(200);

      const recentMints = communityResponse.body.recentMints;
      expect(recentMints.some((nft: any) => nft.name === 'E2E Test NFT')).toBe(true);
    });

    it('should handle concurrent minting requests', async () => {
      const auth1 = await testHelpers.getAuthenticatedRequest('testUser');
      const auth2 = await testHelpers.getAuthenticatedRequest('testCreator');

      // Start concurrent minting
      const mintPromises = [
        auth1.request('post', '/api/mint')
          .send(createMockFormData(sampleModels[0], { name: 'Concurrent NFT 1' })),
        auth2.request('post', '/api/mint')
          .send(createMockFormData(sampleModels[1], { name: 'Concurrent NFT 2' })),
      ];

      const responses = await Promise.all(mintPromises);

      // Both should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('transactionId');
      });

      // Wait for both to complete
      await Promise.all(responses.map(async (response) => {
        let status = 'pending';
        let attempts = 0;
        
        while (status !== 'completed' && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const statusResponse = await request(app)
            .get(`/api/mint/status/${response.body.transactionId}`)
            .expect(200);

          status = statusResponse.body.status;
          attempts++;
        }
        
        expect(status).toBe('completed');
      }));

      // Verify both NFTs exist
      const portfolio1 = await auth1.request('get', `/api/portfolio/${auth1.account.address}`)
        .expect(200);
      const portfolio2 = await auth2.request('get', `/api/portfolio/${auth2.account.address}`)
        .expect(200);

      expect(portfolio1.body.nfts).toHaveLength(1);
      expect(portfolio2.body.nfts).toHaveLength(1);
      expect(portfolio1.body.nfts[0].name).toBe('Concurrent NFT 1');
      expect(portfolio2.body.nfts[0].name).toBe('Concurrent NFT 2');
    });

    it('should handle minting failures gracefully', async () => {
      const auth = await testHelpers.getAuthenticatedRequest('testUser');

      // Mock blockchain failure
      const restoreBlockchain = await testHelpers.simulateBlockchainError();

      try {
        const mintResponse = await auth.request('post', '/api/mint')
          .send(createMockFormData(sampleModels[0], { name: 'Failed NFT' }))
          .expect(500);

        expect(mintResponse.body).toHaveProperty('error');
      } finally {
        restoreBlockchain();
      }

      // Verify no NFT was created
      const portfolioResponse = await auth.request('get', `/api/portfolio/${auth.account.address}`)
        .expect(200);

      expect(portfolioResponse.body.nfts).toHaveLength(0);
    });
  });

  describe('Portfolio Synchronization E2E', () => {
    it('should sync portfolio data from blockchain', async () => {
      const auth = await testHelpers.getAuthenticatedRequest('testUser');

      // Add some test NFTs to simulate blockchain state
      const testNFTs = [
        generateRandomNFTMetadata({ creator: auth.account.address }),
        generateRandomNFTMetadata({ creator: auth.account.address }),
      ];

      for (const nft of testNFTs) {
        await testDatabase.addTestNFT(nft);
      }

      // Trigger sync
      const syncResponse = await auth.request('post', '/api/portfolio/sync')
        .send({ address: auth.account.address })
        .expect(200);

      expect(syncResponse.body).toHaveProperty('success', true);
      expect(syncResponse.body).toHaveProperty('synced');

      // Verify portfolio is updated
      const portfolioResponse = await auth.request('get', `/api/portfolio/${auth.account.address}`)
        .expect(200);

      expect(portfolioResponse.body.nfts.length).toBeGreaterThanOrEqual(testNFTs.length);
      expect(portfolioResponse.body.createdCount).toBeGreaterThanOrEqual(testNFTs.length);
    });

    it('should handle sync conflicts correctly', async () => {
      const auth = await testHelpers.getAuthenticatedRequest('testUser');

      // Create NFT locally
      const localNFT = generateRandomNFTMetadata({ 
        creator: auth.account.address,
        id: 'conflict-nft-1',
      });
      await testDatabase.addTestNFT(localNFT);

      // Simulate blockchain having different version
      const blockchainNFT = {
        ...localNFT,
        name: 'Blockchain Version',
        timestamp: localNFT.timestamp + 1000,
      };

      // Mock blockchain query to return different version
      const originalQuery = testDatabase.getNFTById;
      testDatabase.getNFTById = jest.fn().mockResolvedValue(blockchainNFT);

      try {
        const syncResponse = await auth.request('post', '/api/portfolio/sync')
          .send({ address: auth.account.address })
          .expect(200);

        expect(syncResponse.body.success).toBe(true);

        // Verify blockchain version takes precedence
        const portfolioResponse = await auth.request('get', `/api/portfolio/${auth.account.address}`)
          .expect(200);

        const syncedNFT = portfolioResponse.body.nfts.find((nft: any) => nft.id === 'conflict-nft-1');
        expect(syncedNFT.name).toBe('Blockchain Version');
      } finally {
        testDatabase.getNFTById = originalQuery;
      }
    });
  });

  describe('Community Discovery E2E', () => {
    it('should update community feed in real-time', async () => {
      // Initial community state
      let communityResponse = await request(app)
        .get('/api/community')
        .expect(200);

      const initialCount = communityResponse.body.totalNFTs;

      // Mint new NFT
      const auth = await testHelpers.getAuthenticatedRequest('testCreator');
      const mintResult = await testHelpers.simulateMintingProcess('testCreator');

      // Wait for minting to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check community feed updated
      communityResponse = await request(app)
        .get('/api/community')
        .expect(200);

      expect(communityResponse.body.totalNFTs).toBe(initialCount + 1);
      expect(communityResponse.body.recentMints.length).toBeGreaterThan(0);
    });

    it('should filter community content correctly', async () => {
      // Add test NFTs from different creators
      const creators = [
        await testHelpers.getAuthenticatedRequest('testUser'),
        await testHelpers.getAuthenticatedRequest('testCreator'),
      ];

      for (const auth of creators) {
        const nft = generateRandomNFTMetadata({ creator: auth.account.address });
        await testDatabase.addTestNFT(nft);
      }

      // Test creator filter
      const filteredResponse = await request(app)
        .get('/api/community')
        .query({ creator: creators[0].account.address })
        .expect(200);

      const creatorNFTs = filteredResponse.body.recentMints;
      expect(creatorNFTs.every((nft: any) => nft.creator === creators[0].account.address)).toBe(true);

      // Test category filter
      const categoryResponse = await request(app)
        .get('/api/community')
        .query({ category: 'sculpture' })
        .expect(200);

      const sculptureNFTs = categoryResponse.body.recentMints;
      expect(sculptureNFTs.every((nft: any) => nft.attributes?.category === 'sculpture')).toBe(true);
    });
  });

  describe('Error Handling E2E', () => {
    it('should handle database connection failures', async () => {
      // Simulate database failure
      const originalRedis = testDatabase.getRedisClient();
      await originalRedis.disconnect();

      const auth = await testHelpers.getAuthenticatedRequest('testUser');

      // API should return appropriate error
      const response = await auth.request('get', `/api/portfolio/${auth.account.address}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/database/i);

      // Restore connection
      await testDatabase.initialize();
    });

    it('should handle network timeouts gracefully', async () => {
      const auth = await testHelpers.getAuthenticatedRequest('testUser');

      // Mock slow network response
      const restoreNetwork = await testHelpers.simulateNetworkError();

      try {
        const response = await auth.request('post', '/api/mint')
          .send(createMockFormData(sampleModels[0], { name: 'Timeout Test' }))
          .timeout(1000)
          .expect(408);

        expect(response.body).toHaveProperty('error');
      } finally {
        restoreNetwork();
      }
    });
  });

  describe('Performance E2E', () => {
    it('should handle high load efficiently', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      // Create multiple authenticated users
      const auths = await Promise.all(
        Array.from({ length: 5 }, () => testHelpers.getAuthenticatedRequest('testUser'))
      );

      // Generate concurrent requests
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const auth = auths[i % auths.length];
        return auth.request('get', `/api/portfolio/${auth.account.address}`);
      });

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 20 requests
      
      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms`);
    });

    it('should maintain response times under load', async () => {
      const loadTestResult = await testHelpers.loadTest('get', '/api/community', 15, 200);

      expect(loadTestResult.averageResponseTime).toBeLessThan(2000); // 2s average
      expect(loadTestResult.maxResponseTime).toBeLessThan(5000); // 5s max
      expect(loadTestResult.allWithinThreshold(10000)).toBe(true); // All under 10s

      console.log(`Load test results:
        Average: ${loadTestResult.averageResponseTime.toFixed(2)}ms
        Max: ${loadTestResult.maxResponseTime.toFixed(2)}ms
        Min: ${loadTestResult.minResponseTime.toFixed(2)}ms`);
    });
  });
});