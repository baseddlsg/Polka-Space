import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { analytics, EventType } from '@/services/analyticsService';

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
  preferredChain: string;
  createdAt: string;
  lastActive: string;
  mintedNFTs: number;
  importedNFTs: number;
  createdObjects: number;
  preferences: {
    darkMode: boolean;
    showTutorials: boolean;
    performanceMode: boolean;
    defaultExplorerMode: boolean;
    notificationsEnabled: boolean;
    saveSceneAutomatically: boolean;
  };
}

const defaultPreferences = {
  darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  showTutorials: true,
  performanceMode: false,
  defaultExplorerMode: false,
  notificationsEnabled: true,
  saveSceneAutomatically: true
};

const createDefaultProfile = (walletAddress: string | null = null): UserProfile => ({
  id: `user_${Date.now()}`,
  displayName: null,
  avatarUrl: null,
  walletAddress,
  preferredChain: 'unique',
  createdAt: new Date().toISOString(),
  lastActive: new Date().toISOString(),
  mintedNFTs: 0,
  importedNFTs: 0,
  createdObjects: 0,
  preferences: defaultPreferences
});

/**
 * Hook for managing user profile data
 */
export function useUserProfile() {
  const { selectedAccount } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Load profile from storage on mount and when wallet changes
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const walletAddress = selectedAccount?.address || null;
        
        // Check if we have a stored profile
        const existingProfile = localStorage.getItem('vr_user_profile');
        let userProfile: UserProfile;
        
        if (existingProfile) {
          userProfile = JSON.parse(existingProfile);
          
          // Update wallet address if it changed
          if (walletAddress !== userProfile.walletAddress) {
            userProfile.walletAddress = walletAddress;
          }
        } else {
          // Create new profile
          userProfile = createDefaultProfile(walletAddress);
        }
        
        // Update last active timestamp
        userProfile.lastActive = new Date().toISOString();
        
        // Persist profile to storage
        localStorage.setItem('vr_user_profile', JSON.stringify(userProfile));
        
        // Update state
        setProfile(userProfile);
        
        // Track in analytics
        if (userProfile.walletAddress) {
          analytics.identifyUser(userProfile.id, { 
            walletAddress: userProfile.walletAddress,
            displayName: userProfile.displayName,
            createdAt: userProfile.createdAt
          });
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError(err instanceof Error ? err : new Error('Failed to load user profile'));
        
        // Fallback to default profile
        const defaultProfile = createDefaultProfile(selectedAccount?.address || null);
        setProfile(defaultProfile);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, [selectedAccount]);
  
  /**
   * Update a specific profile field
   */
  const updateProfile = async <K extends keyof UserProfile>(
    field: K, 
    value: UserProfile[K]
  ): Promise<void> => {
    if (!profile) return;
    
    try {
      const updatedProfile = {
        ...profile,
        [field]: value,
        lastActive: new Date().toISOString()
      };
      
      // Persist to storage
      localStorage.setItem('vr_user_profile', JSON.stringify(updatedProfile));
      
      // Update state
      setProfile(updatedProfile);
      
      // Track in analytics
      analytics.setUserProperties({ [field]: value });
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err : new Error(`Failed to update profile field: ${String(field)}`));
    }
  };
  
  /**
   * Update a preference
   */
  const updatePreference = async <K extends keyof UserProfile['preferences']>(
    preference: K, 
    value: UserProfile['preferences'][K]
  ): Promise<void> => {
    if (!profile) return;
    
    try {
      const updatedPreferences = {
        ...profile.preferences,
        [preference]: value
      };
      
      const updatedProfile = {
        ...profile,
        preferences: updatedPreferences,
        lastActive: new Date().toISOString()
      };
      
      // Persist to storage
      localStorage.setItem('vr_user_profile', JSON.stringify(updatedProfile));
      
      // Update state
      setProfile(updatedProfile);
      
      // Track in analytics
      analytics.setUserProperties({ [`preference_${preference}`]: value });
    } catch (err) {
      console.error('Error updating preference:', err);
      setError(err instanceof Error ? err : new Error(`Failed to update preference: ${String(preference)}`));
    }
  };
  
  /**
   * Increment a counter field in the profile
   */
  const incrementCounter = async (
    counter: 'mintedNFTs' | 'importedNFTs' | 'createdObjects',
    incrementBy: number = 1
  ): Promise<void> => {
    if (!profile) return;
    
    try {
      const currentValue = profile[counter] || 0;
      const updatedProfile = {
        ...profile,
        [counter]: currentValue + incrementBy,
        lastActive: new Date().toISOString()
      };
      
      // Persist to storage
      localStorage.setItem('vr_user_profile', JSON.stringify(updatedProfile));
      
      // Update state
      setProfile(updatedProfile);
      
      // Track in analytics
      analytics.setUserProperties({ [counter]: currentValue + incrementBy });
    } catch (err) {
      console.error('Error incrementing counter:', err);
      setError(err instanceof Error ? err : new Error(`Failed to increment counter: ${counter}`));
    }
  };
  
  /**
   * Reset the profile to default values
   */
  const resetProfile = async (): Promise<void> => {
    try {
      const defaultProfile = createDefaultProfile(selectedAccount?.address || null);
      
      // Persist to storage
      localStorage.setItem('vr_user_profile', JSON.stringify(defaultProfile));
      
      // Update state
      setProfile(defaultProfile);
      
      // Track in analytics
      analytics.trackEvent(EventType.ERROR, {
        previousProfileId: profile?.id,
        action: 'profile_reset'
      });
    } catch (err) {
      console.error('Error resetting profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to reset profile'));
    }
  };
  
  return {
    profile,
    isLoading,
    error,
    updateProfile,
    updatePreference,
    incrementCounter,
    resetProfile
  };
}

export default useUserProfile; 