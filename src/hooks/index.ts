// Blockchain state synchronization hooks
export { usePortfolio, type UsePortfolioOptions, type UsePortfolioReturn } from './usePortfolio';
export { useNFTStatus, type UseNFTStatusOptions, type UseNFTStatusReturn } from './useNFTStatus';
export { useCommunityFeed, type UseCommunityFeedOptions, type UseCommunityFeedReturn } from './useCommunityFeed';

// Existing hooks
export { default as useUserProfile, type UserProfile } from './use-user-profile';
export { default as useMobile } from './use-mobile';
export { useToast } from './use-toast';