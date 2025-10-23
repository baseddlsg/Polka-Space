/**
 * Production Configuration
 * Environment-specific settings for production deployment
 */

export interface ProductionConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    rateLimiting: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
  };
  blockchain: {
    networks: {
      polkadot: {
        wsUrl: string;
        httpUrl: string;
      };
      kusama: {
        wsUrl: string;
        httpUrl: string;
      };
      assethub: {
        wsUrl: string;
        httpUrl: string;
      };
    };
    defaultNetwork: string;
    connectionTimeout: number;
    maxReconnectAttempts: number;
  };
  performance: {
    maxConcurrentModels: number;
    modelCacheSize: number;
    queryBatchSize: number;
    enableServiceWorker: boolean;
    enableCompression: boolean;
    enableCDN: boolean;
  };
  security: {
    enableCSP: boolean;
    enableHSTS: boolean;
    enableCORS: boolean;
    allowedOrigins: string[];
    maxFileSize: number;
  };
  monitoring: {
    enableAnalytics: boolean;
    enableErrorTracking: boolean;
    enablePerformanceMonitoring: boolean;
    sampleRate: number;
  };
  features: {
    enableVR: boolean;
    enableAR: boolean;
    enableOfflineMode: boolean;
    enablePWA: boolean;
    enableNotifications: boolean;
  };
}

// Production configuration
export const productionConfig: ProductionConfig = {
  api: {
    baseUrl: process.env.VITE_API_BASE_URL || 'https://api.vrgenesisframe.com',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000 // 1 minute
    }
  },
  blockchain: {
    networks: {
      polkadot: {
        wsUrl: process.env.VITE_POLKADOT_WS_URL || 'wss://rpc.polkadot.io',
        httpUrl: process.env.VITE_POLKADOT_HTTP_URL || 'https://rpc.polkadot.io'
      },
      kusama: {
        wsUrl: process.env.VITE_KUSAMA_WS_URL || 'wss://kusama-rpc.polkadot.io',
        httpUrl: process.env.VITE_KUSAMA_HTTP_URL || 'https://kusama-rpc.polkadot.io'
      },
      assethub: {
        wsUrl: process.env.VITE_ASSETHUB_WS_URL || 'wss://polkadot-asset-hub-rpc.polkadot.io',
        httpUrl: process.env.VITE_ASSETHUB_HTTP_URL || 'https://polkadot-asset-hub-rpc.polkadot.io'
      }
    },
    defaultNetwork: 'assethub',
    connectionTimeout: 10000, // 10 seconds
    maxReconnectAttempts: 5
  },
  performance: {
    maxConcurrentModels: 3, // Reduced for production stability
    modelCacheSize: 30, // Reduced memory usage
    queryBatchSize: 5, // Smaller batches for better UX
    enableServiceWorker: true,
    enableCompression: true,
    enableCDN: true
  },
  security: {
    enableCSP: true,
    enableHSTS: true,
    enableCORS: true,
    allowedOrigins: [
      'https://vrgenesisframe.com',
      'https://www.vrgenesisframe.com',
      'https://app.vrgenesisframe.com'
    ],
    maxFileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  monitoring: {
    enableAnalytics: true,
    enableErrorTracking: true,
    enablePerformanceMonitoring: true,
    sampleRate: 0.1 // 10% sampling for performance
  },
  features: {
    enableVR: true,
    enableAR: false, // Disabled in initial production release
    enableOfflineMode: true,
    enablePWA: true,
    enableNotifications: true
  }
};

// Development configuration (for comparison)
export const developmentConfig: ProductionConfig = {
  api: {
    baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
    timeout: 10000,
    retryAttempts: 1,
    rateLimiting: {
      enabled: false,
      maxRequests: 1000,
      windowMs: 60000
    }
  },
  blockchain: {
    networks: {
      polkadot: {
        wsUrl: 'wss://rpc.polkadot.io',
        httpUrl: 'https://rpc.polkadot.io'
      },
      kusama: {
        wsUrl: 'wss://kusama-rpc.polkadot.io',
        httpUrl: 'https://kusama-rpc.polkadot.io'
      },
      assethub: {
        wsUrl: 'wss://polkadot-asset-hub-rpc.polkadot.io',
        httpUrl: 'https://polkadot-asset-hub-rpc.polkadot.io'
      }
    },
    defaultNetwork: 'assethub',
    connectionTimeout: 5000,
    maxReconnectAttempts: 3
  },
  performance: {
    maxConcurrentModels: 10, // Higher for development
    modelCacheSize: 100,
    queryBatchSize: 20,
    enableServiceWorker: false,
    enableCompression: false,
    enableCDN: false
  },
  security: {
    enableCSP: false,
    enableHSTS: false,
    enableCORS: false,
    allowedOrigins: ['*'],
    maxFileSize: 100 * 1024 * 1024 // 100MB for development
  },
  monitoring: {
    enableAnalytics: false,
    enableErrorTracking: true,
    enablePerformanceMonitoring: true,
    sampleRate: 1.0 // 100% sampling for development
  },
  features: {
    enableVR: true,
    enableAR: true, // Enabled for testing
    enableOfflineMode: false,
    enablePWA: false,
    enableNotifications: false
  }
};

// Get configuration based on environment
export function getConfig(): ProductionConfig {
  const env = import.meta.env.MODE || 'development';
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

// Environment-specific feature flags
export function isFeatureEnabled(feature: keyof ProductionConfig['features']): boolean {
  const config = getConfig();
  return config.features[feature];
}

// Environment-specific API configuration
export function getApiConfig() {
  const config = getConfig();
  return config.api;
}

// Environment-specific blockchain configuration
export function getBlockchainConfig() {
  const config = getConfig();
  return config.blockchain;
}

// Environment-specific performance configuration
export function getPerformanceConfig() {
  const config = getConfig();
  return config.performance;
}

// Environment-specific security configuration
export function getSecurityConfig() {
  const config = getConfig();
  return config.security;
}

// Environment-specific monitoring configuration
export function getMonitoringConfig() {
  const config = getConfig();
  return config.monitoring;
}

export default getConfig;