/**
 * Analytics service for tracking user interactions and events
 * 
 * This service provides methods for tracking various events in the application.
 * In a production environment, this would connect to a real analytics provider
 * like Google Analytics, Mixpanel, or a custom backend.
 */

// Event types for type safety
export enum EventType {
  PAGE_VIEW = 'page_view',
  OBJECT_CREATE = 'object_create',
  OBJECT_DELETE = 'object_delete',
  OBJECT_TRANSFORM = 'object_transform',
  NFT_MINT = 'nft_mint',
  NFT_IMPORT = 'nft_import',
  WALLET_CONNECT = 'wallet_connect',
  VR_SESSION_START = 'vr_session_start',
  EXPLORER_MODE_TOGGLE = 'explorer_mode_toggle',
  ERROR = 'error'
}

// Event data interface
export interface EventData {
  [key: string]: any;
}

// User properties interface
export interface UserProperties {
  userId?: string;
  walletAddress?: string;
  deviceType?: string;
  browser?: string;
  referrer?: string;
  [key: string]: any;
}

class AnalyticsService {
  private isInitialized = false;
  private userProperties: UserProperties = {};
  private debugMode = import.meta.env.DEV || false;

  /**
   * Initialize the analytics service
   */
  public init(): void {
    if (this.isInitialized) {
      return;
    }

    // Set basic user properties
    this.userProperties = {
      deviceType: this.getDeviceType(),
      browser: this.getBrowser(),
      referrer: document.referrer,
      language: navigator.language,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString()
    };

    // In a real implementation, we would initialize the analytics provider here
    console.log('Analytics initialized:', this.userProperties);
    this.isInitialized = true;
    
    // Track initial page view
    this.trackEvent(EventType.PAGE_VIEW, {
      page: window.location.pathname,
      title: document.title
    });
  }

  /**
   * Track an event
   * @param eventType The type of event to track
   * @param eventData Additional data to include with the event
   */
  public trackEvent(eventType: EventType, eventData: EventData = {}): void {
    if (!this.isInitialized) {
      this.init();
    }

    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data: eventData,
      user: this.userProperties,
      url: window.location.href
    };

    // In a real implementation, we would send the event to an analytics provider
    if (this.debugMode) {
      console.log(`[Analytics] ${eventType}:`, event);
    }

    // For now, just log events to console in non-production
    if (import.meta.env.DEV) {
      this.logEventToConsole(event);
    }
  }

  /**
   * Set user properties
   * @param properties User properties to set
   */
  public setUserProperties(properties: UserProperties): void {
    this.userProperties = {
      ...this.userProperties,
      ...properties,
      lastUpdated: new Date().toISOString()
    };

    if (this.debugMode) {
      console.log('[Analytics] User properties updated:', this.userProperties);
    }
  }

  /**
   * Identify a user
   * @param userId User ID or wallet address
   * @param properties Additional user properties
   */
  public identifyUser(userId: string, properties: UserProperties = {}): void {
    this.setUserProperties({
      userId,
      ...properties
    });

    if (this.debugMode) {
      console.log(`[Analytics] User identified: ${userId}`);
    }
  }

  /**
   * Track a page view
   * @param page Page path
   * @param title Page title
   */
  public trackPageView(page: string = window.location.pathname, title: string = document.title): void {
    this.trackEvent(EventType.PAGE_VIEW, {
      page,
      title,
      referrer: document.referrer
    });
  }

  /**
   * Track a wallet connection
   * @param address Wallet address
   * @param provider Wallet provider name
   */
  public trackWalletConnect(address: string, provider: string): void {
    this.identifyUser(address, { walletAddress: address });
    this.trackEvent(EventType.WALLET_CONNECT, {
      address,
      provider
    });
  }

  /**
   * Track NFT minting
   * @param tokenId Token ID of the minted NFT
   * @param chain Blockchain on which the NFT was minted
   * @param objectType Type of object that was minted
   */
  public trackNFTMint(tokenId: string, chain: string, objectType: string): void {
    this.trackEvent(EventType.NFT_MINT, {
      tokenId,
      chain,
      objectType
    });
  }

  /**
   * Track an error
   * @param errorMessage Error message
   * @param errorCode Error code if available
   * @param errorContext Additional context about the error
   */
  public trackError(errorMessage: string, errorCode?: string, errorContext?: any): void {
    this.trackEvent(EventType.ERROR, {
      message: errorMessage,
      code: errorCode,
      context: errorContext,
      stack: new Error().stack
    });
  }

  /**
   * Get the device type
   * @returns Device type (mobile, tablet, desktop)
   */
  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      return 'tablet';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Get the browser name
   * @returns Browser name
   */
  private getBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Chrome') > -1) {
      return 'Chrome';
    }
    if (userAgent.indexOf('Safari') > -1) {
      return 'Safari';
    }
    if (userAgent.indexOf('Firefox') > -1) {
      return 'Firefox';
    }
    if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) {
      return 'Internet Explorer';
    }
    if (userAgent.indexOf('Edge') > -1) {
      return 'Edge';
    }
    return 'Unknown';
  }

  /**
   * Log an event to the console
   * @param event Event to log
   */
  private logEventToConsole(event: any): void {
    const styles = {
      PAGE_VIEW: 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;',
      OBJECT_CREATE: 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 2px;',
      OBJECT_DELETE: 'background: #F44336; color: white; padding: 2px 5px; border-radius: 2px;',
      OBJECT_TRANSFORM: 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 2px;',
      NFT_MINT: 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 2px;',
      NFT_IMPORT: 'background: #607D8B; color: white; padding: 2px 5px; border-radius: 2px;',
      WALLET_CONNECT: 'background: #795548; color: white; padding: 2px 5px; border-radius: 2px;',
      VR_SESSION_START: 'background: #E91E63; color: white; padding: 2px 5px; border-radius: 2px;',
      EXPLORER_MODE_TOGGLE: 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 2px;',
      ERROR: 'background: #F44336; color: white; padding: 2px 5px; border-radius: 2px;',
      default: 'background: #9E9E9E; color: white; padding: 2px 5px; border-radius: 2px;'
    };

    const style = styles[event.type as keyof typeof styles] || styles.default;
    console.log(`%c ${event.type} `, style, event.data);
  }
}

// Export a singleton instance
export const analytics = new AnalyticsService();

// Initialize analytics immediately
analytics.init();

export default analytics; 