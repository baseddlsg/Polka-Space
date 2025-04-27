#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

/// Polkadot Asset Hub NFT Contract for VR Genesis Frame
/// This contract implements a cross-chain capable NFT collection specifically
/// designed for 3D assets and compatible with XCM (Cross-Consensus Messaging).
#[ink::contract]
mod asset_hub_nft {
    use ink_storage::{
        collections::HashMap as StorageHashMap,
        traits::{PackedLayout, SpreadLayout},
    };
    use scale::{Decode, Encode};

    /// Custom event emitted when a token is minted
    #[ink(event)]
    pub struct NFTMinted {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        token_id: u32,
        /// IPFS URI pointing to the 3D model and metadata
        metadata_uri: String,
        /// Name of the NFT
        name: String,
    }

    /// Event emitted when a token is transferred via XCM
    #[ink(event)]
    pub struct XCMTransfer {
        #[ink(topic)]
        from: AccountId,
        token_id: u32,
        /// Destination parachain ID
        dest_para_id: u32,
        /// Address on destination chain
        dest_account: [u8; 32],
    }

    /// Event emitted for standard transfers
    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        #[ink(topic)]
        token_id: u32,
    }

    /// XCM transfer status
    #[derive(Debug, Clone, Encode, Decode, SpreadLayout, PackedLayout)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum XCMStatus {
        NotStarted,
        InProgress,
        Completed,
        Failed,
    }

    /// NFT metadata and XCM-related information
    #[derive(Debug, Clone, Encode, Decode, SpreadLayout, PackedLayout)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct NFTMetadata {
        /// IPFS URI pointing to metadata JSON
        pub metadata_uri: String,
        /// Original creator of the NFT
        pub creator: AccountId,
        /// Timestamp when created
        pub created_at: u64,
        /// 3D model type (box, sphere, custom, etc.)
        pub model_type: String,
        /// Optional original chain ID if transferred via XCM
        pub origin_chain_id: Option<u32>,
        /// Status of XCM transfer if applicable
        pub xcm_status: XCMStatus,
        /// Additional properties for 3D models (JSON string)
        pub properties: String,
    }

    /// Main storage for the NFT contract
    #[ink(storage)]
    pub struct AssetHubNFT {
        /// Token ID counter
        next_token_id: u32,
        /// Token owner mapping
        token_owner: StorageHashMap<u32, AccountId>,
        /// Token metadata mapping
        token_metadata: StorageHashMap<u32, NFTMetadata>,
        /// Owner token count
        balances: StorageHashMap<AccountId, u32>,
        /// Owner's tokens list
        owned_tokens: StorageHashMap<AccountId, Vec<u32>>,
        /// Token approval mapping
        approvals: StorageHashMap<u32, AccountId>,
        /// Contract name
        name: String,
        /// Contract symbol
        symbol: String,
        /// Admin account (needed for XCM operations)
        admin: AccountId,
    }

    impl AssetHubNFT {
        /// Constructor to initialize the NFT collection
        #[ink(constructor)]
        pub fn new(name: String, symbol: String) -> Self {
            let caller = Self::env().caller();
            Self {
                next_token_id: 1, // Start from 1
                token_owner: StorageHashMap::new(),
                token_metadata: StorageHashMap::new(),
                balances: StorageHashMap::new(),
                owned_tokens: StorageHashMap::new(),
                approvals: StorageHashMap::new(),
                name,
                symbol,
                admin: caller,
            }
        }

        /// Get the name of the NFT collection
        #[ink(message)]
        pub fn name(&self) -> String {
            self.name.clone()
        }

        /// Get the symbol of the NFT collection
        #[ink(message)]
        pub fn symbol(&self) -> String {
            self.symbol.clone()
        }

        /// Get the balance of an account
        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> u32 {
            *self.balances.get(&owner).unwrap_or(&0)
        }

        /// Get the owner of a token
        #[ink(message)]
        pub fn owner_of(&self, token_id: u32) -> Option<AccountId> {
            self.token_owner.get(&token_id).cloned()
        }

        /// Get the metadata URI for a token
        #[ink(message)]
        pub fn token_uri(&self, token_id: u32) -> Option<String> {
            self.token_metadata.get(&token_id).map(|metadata| metadata.metadata_uri.clone())
        }

        /// Get detailed metadata for a token
        #[ink(message)]
        pub fn token_metadata(&self, token_id: u32) -> Option<NFTMetadata> {
            self.token_metadata.get(&token_id).cloned()
        }

        /// Get all tokens owned by an address
        #[ink(message)]
        pub fn tokens_of_owner(&self, owner: AccountId) -> Vec<u32> {
            self.owned_tokens.get(&owner).cloned().unwrap_or_default()
        }

        /// Mint a new 3D NFT
        #[ink(message)]
        pub fn mint_token(
            &mut self,
            owner: AccountId,
            metadata_uri: String,
            name: String,
            model_type: String,
            properties: String,
        ) -> u32 {
            let caller = self.env().caller();
            let token_id = self.next_token_id;
            
            // Record timestamp
            let now = self.env().block_timestamp();
            
            // Create metadata
            let metadata = NFTMetadata {
                metadata_uri: metadata_uri.clone(),
                creator: caller,
                created_at: now,
                model_type,
                origin_chain_id: None, // Minted natively on Asset Hub
                xcm_status: XCMStatus::NotStarted,
                properties,
            };
            
            // Update storage
            self.token_owner.insert(token_id, owner);
            self.token_metadata.insert(token_id, metadata);
            
            // Update balance
            let balance = self.balances.entry(owner).or_insert(0);
            *balance += 1;
            
            // Update owned tokens
            let mut owned = self.owned_tokens.get(&owner).cloned().unwrap_or_default();
            owned.push(token_id);
            self.owned_tokens.insert(owner, owned);
            
            // Increment token ID counter
            self.next_token_id += 1;
            
            // Emit events
            self.env().emit_event(NFTMinted {
                owner,
                token_id,
                metadata_uri,
                name,
            });
            
            self.env().emit_event(Transfer {
                from: None,
                to: Some(owner),
                token_id,
            });
            
            token_id
        }

        /// Transfer an NFT from one address to another
        #[ink(message)]
        pub fn transfer(&mut self, to: AccountId, token_id: u32) -> bool {
            let caller = self.env().caller();
            
            // Check if the token exists and caller is the owner or approved
            let owner = match self.token_owner.get(&token_id) {
                Some(o) => *o,
                None => return false, // Token doesn't exist
            };
            
            if owner != caller && !self.is_approved(caller, token_id) {
                return false; // Not authorized
            }
            
            // Remove from current owner's list
            if let Some(mut owned) = self.owned_tokens.get(&owner).cloned() {
                owned.retain(|&t| t != token_id);
                self.owned_tokens.insert(owner, owned);
            }
            
            // Update balances
            if let Some(balance) = self.balances.get_mut(&owner) {
                *balance -= 1;
            }
            
            let to_balance = self.balances.entry(to).or_insert(0);
            *to_balance += 1;
            
            // Add to new owner's list
            let mut new_owned = self.owned_tokens.get(&to).cloned().unwrap_or_default();
            new_owned.push(token_id);
            self.owned_tokens.insert(to, new_owned);
            
            // Update ownership
            self.token_owner.insert(token_id, to);
            
            // Clear approval
            self.approvals.remove(&token_id);
            
            // Emit event
            self.env().emit_event(Transfer {
                from: Some(owner),
                to: Some(to),
                token_id,
            });
            
            true
        }

        /// Approve another account to transfer a token
        #[ink(message)]
        pub fn approve(&mut self, to: AccountId, token_id: u32) -> bool {
            let caller = self.env().caller();
            
            // Check if the token exists and caller is the owner
            match self.token_owner.get(&token_id) {
                Some(&owner) if owner == caller => {
                    self.approvals.insert(token_id, to);
                    true
                }
                _ => false,
            }
        }

        /// Check if an account is approved for a token
        #[ink(message)]
        pub fn is_approved(&self, operator: AccountId, token_id: u32) -> bool {
            match self.approvals.get(&token_id) {
                Some(&approved) => approved == operator,
                None => false,
            }
        }

        /// Initiate XCM transfer to another parachain (admin only for now)
        /// In a production environment, this would interface with pallet_xcm
        #[ink(message)]
        pub fn initiate_xcm_transfer(
            &mut self,
            token_id: u32,
            dest_para_id: u32,
            dest_account: [u8; 32],
        ) -> bool {
            let caller = self.env().caller();
            
            // For now, only admin can initiate XCM transfers
            // In production, this would check ownership and handle fees
            if caller != self.admin {
                return false;
            }
            
            // Check if token exists
            let owner = match self.token_owner.get(&token_id) {
                Some(o) => *o,
                None => return false,
            };
            
            // Update XCM status
            if let Some(mut metadata) = self.token_metadata.get(&token_id).cloned() {
                metadata.xcm_status = XCMStatus::InProgress;
                self.token_metadata.insert(token_id, metadata);
            }
            
            // In real implementation:
            // 1. Would prepare XCM message format
            // 2. Call into pallet_xcm
            // 3. Handle fee payment
            // 4. Wait for confirmation
            
            // Emit event for the transfer
            self.env().emit_event(XCMTransfer {
                from: owner,
                token_id,
                dest_para_id,
                dest_account,
            });
            
            // In this mock version, we'll just transfer ownership to admin temporarily
            // In real XCM implementation, ownership would be transferred to the destination chain
            if let Some(mut owned) = self.owned_tokens.get(&owner).cloned() {
                owned.retain(|&t| t != token_id);
                self.owned_tokens.insert(owner, owned);
            }
            
            if let Some(balance) = self.balances.get_mut(&owner) {
                *balance -= 1;
            }
            
            let admin_balance = self.balances.entry(self.admin).or_insert(0);
            *admin_balance += 1;
            
            let mut admin_owned = self.owned_tokens.get(&self.admin).cloned().unwrap_or_default();
            admin_owned.push(token_id);
            self.owned_tokens.insert(self.admin, admin_owned);
            
            self.token_owner.insert(token_id, self.admin);
            
            // Return success
            true
        }
        
        /// Receive an NFT via XCM (admin only, simulated)
        /// In production, this would be called by the XCM handler
        #[ink(message)]
        pub fn receive_xcm_nft(
            &mut self,
            to: AccountId,
            metadata_uri: String,
            name: String,
            model_type: String,
            properties: String,
            origin_chain_id: u32,
        ) -> u32 {
            let caller = self.env().caller();
            
            // Only admin can receive XCM NFTs in this mock
            if caller != self.admin {
                return 0;
            }
            
            let token_id = self.next_token_id;
            let now = self.env().block_timestamp();
            
            // Create metadata with origin chain info
            let metadata = NFTMetadata {
                metadata_uri: metadata_uri.clone(),
                creator: self.admin, // Original creator not known
                created_at: now,
                model_type,
                origin_chain_id: Some(origin_chain_id),
                xcm_status: XCMStatus::Completed,
                properties,
            };
            
            // Update storage
            self.token_owner.insert(token_id, to);
            self.token_metadata.insert(token_id, metadata);
            
            // Update balance
            let balance = self.balances.entry(to).or_insert(0);
            *balance += 1;
            
            // Update owned tokens
            let mut owned = self.owned_tokens.get(&to).cloned().unwrap_or_default();
            owned.push(token_id);
            self.owned_tokens.insert(to, owned);
            
            // Increment token ID counter
            self.next_token_id += 1;
            
            // Emit events
            self.env().emit_event(NFTMinted {
                owner: to,
                token_id,
                metadata_uri,
                name,
            });
            
            self.env().emit_event(Transfer {
                from: None,
                to: Some(to),
                token_id,
            });
            
            token_id
        }
    }

    /// Unit tests
    #[cfg(test)]
    mod tests {
        use super::*;
        use ink_lang as ink;

        #[ink::test]
        fn minting_works() {
            let accounts = ink_env::test::default_accounts::<ink_env::DefaultEnvironment>();
            let mut nft = AssetHubNFT::new(
                String::from("VR Genesis Asset Hub NFT"),
                String::from("VRAH"),
            );
            
            // Mint a token
            let token_id = nft.mint_token(
                accounts.alice, 
                String::from("ipfs://QmMetadata"),
                String::from("3D Cube"),
                String::from("box"),
                String::from("{\"color\":\"#ff0000\",\"size\":1.0}"),
            );
            
            // Check that Alice is the owner
            assert_eq!(nft.owner_of(token_id), Some(accounts.alice));
            
            // Check the balance
            assert_eq!(nft.balance_of(accounts.alice), 1);
            
            // Check the token URI
            assert_eq!(nft.token_uri(token_id), Some(String::from("ipfs://QmMetadata")));
            
            // Check tokens of owner
            let alice_tokens = nft.tokens_of_owner(accounts.alice);
            assert_eq!(alice_tokens.len(), 1);
            assert_eq!(alice_tokens[0], token_id);
        }

        #[ink::test]
        fn transfer_works() {
            let accounts = ink_env::test::default_accounts::<ink_env::DefaultEnvironment>();
            let mut nft = AssetHubNFT::new(
                String::from("VR Genesis Asset Hub NFT"),
                String::from("VRAH"),
            );
            
            // Set caller to Alice
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(accounts.alice);
            
            // Mint a token
            let token_id = nft.mint_token(
                accounts.alice, 
                String::from("ipfs://QmMetadata"),
                String::from("3D Cube"),
                String::from("box"),
                String::from("{\"color\":\"#ff0000\",\"size\":1.0}"),
            );
            
            // Transfer to Bob
            assert!(nft.transfer(accounts.bob, token_id));
            
            // Check that Bob is now the owner
            assert_eq!(nft.owner_of(token_id), Some(accounts.bob));
            
            // Check balances
            assert_eq!(nft.balance_of(accounts.alice), 0);
            assert_eq!(nft.balance_of(accounts.bob), 1);
            
            // Check tokens of owners
            let alice_tokens = nft.tokens_of_owner(accounts.alice);
            assert_eq!(alice_tokens.len(), 0);
            
            let bob_tokens = nft.tokens_of_owner(accounts.bob);
            assert_eq!(bob_tokens.len(), 1);
            assert_eq!(bob_tokens[0], token_id);
        }
        
        #[ink::test]
        fn xcm_operations_work() {
            let accounts = ink_env::test::default_accounts::<ink_env::DefaultEnvironment>();
            let mut nft = AssetHubNFT::new(
                String::from("VR Genesis Asset Hub NFT"),
                String::from("VRAH"),
            );
            
            // Set caller to admin (contract creator)
            let admin = accounts.alice;
            ink_env::test::set_caller::<ink_env::DefaultEnvironment>(admin);
            
            // Mint a token
            let token_id = nft.mint_token(
                accounts.bob, 
                String::from("ipfs://QmMetadata"),
                String::from("3D Cube"),
                String::from("box"),
                String::from("{\"color\":\"#ff0000\",\"size\":1.0}"),
            );
            
            // Check that Bob is the owner
            assert_eq!(nft.owner_of(token_id), Some(accounts.bob));
            
            // Simulate XCM transfer (admin only)
            let dest_account = [0u8; 32];
            assert!(nft.initiate_xcm_transfer(token_id, 2004, dest_account));
            
            // Check that admin temporarily holds the token
            assert_eq!(nft.owner_of(token_id), Some(admin));
            
            // Simulate receiving an NFT from another chain
            let received_id = nft.receive_xcm_nft(
                accounts.charlie,
                String::from("ipfs://QmOtherChainMetadata"),
                String::from("Imported Sphere"),
                String::from("sphere"),
                String::from("{\"color\":\"#0000ff\",\"radius\":0.5}"),
                2004, // Moonbeam chain ID
            );
            
            // Check that Charlie received the NFT
            assert_eq!(nft.owner_of(received_id), Some(accounts.charlie));
            
            // Check the metadata contains the origin chain
            let metadata = nft.token_metadata(received_id).unwrap();
            assert_eq!(metadata.origin_chain_id, Some(2004));
            assert_eq!(metadata.xcm_status, XCMStatus::Completed);
        }
    }
} 