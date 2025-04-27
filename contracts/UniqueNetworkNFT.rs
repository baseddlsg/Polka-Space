#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod vr_genesis_nft {
    use ink_storage::{
        collections::HashMap as StorageHashMap,
        traits::{PackedLayout, SpreadLayout},
    };
    use scale::{Decode, Encode};

    /// Event emitted when a token is minted
    #[ink(event)]
    pub struct NFTMinted {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        token_id: u32,
        metadata_uri: String,
    }

    /// Event emitted when a token is transferred
    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        #[ink(topic)]
        token_id: u32,
    }

    /// NFT Metadata structure
    #[derive(Debug, Clone, Encode, Decode, SpreadLayout, PackedLayout)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct NFTMetadata {
        metadata_uri: String,
        creator: AccountId,
        created_at: u64,
    }

    /// Main storage for the NFT contract
    #[ink(storage)]
    pub struct VRGenesisNFT {
        /// Token ID counter
        next_token_id: u32,
        /// Token owner mapping
        token_owner: StorageHashMap<u32, AccountId>,
        /// Token metadata mapping
        token_metadata: StorageHashMap<u32, NFTMetadata>,
        /// Owner token count
        balances: StorageHashMap<AccountId, u32>,
        /// Contract name
        name: String,
        /// Contract symbol
        symbol: String,
    }

    impl VRGenesisNFT {
        /// Initialize a new NFT contract
        #[ink(constructor)]
        pub fn new(name: String, symbol: String) -> Self {
            Self {
                next_token_id: 1, // Start from 1
                token_owner: StorageHashMap::new(),
                token_metadata: StorageHashMap::new(),
                balances: StorageHashMap::new(),
                name,
                symbol,
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

        /// Mint a new NFT
        #[ink(message)]
        pub fn mint_token(&mut self, owner: AccountId, metadata_uri: String) -> u32 {
            let caller = self.env().caller();
            let token_id = self.next_token_id;
            
            // Record timestamp
            let now = self.env().block_timestamp();
            
            // Create metadata
            let metadata = NFTMetadata {
                metadata_uri: metadata_uri.clone(),
                creator: caller,
                created_at: now,
            };
            
            // Update storage
            self.token_owner.insert(token_id, owner);
            self.token_metadata.insert(token_id, metadata);
            
            // Update balance
            let balance = self.balances.entry(owner).or_insert(0);
            *balance += 1;
            
            // Increment token ID counter
            self.next_token_id += 1;
            
            // Emit events
            self.env().emit_event(NFTMinted {
                owner,
                token_id,
                metadata_uri,
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
            
            // Check if the token exists and caller is the owner
            if let Some(owner) = self.token_owner.get(&token_id) {
                if *owner != caller {
                    return false; // Not the owner
                }
            } else {
                return false; // Token doesn't exist
            }
            
            // Update balances
            if let Some(balance) = self.balances.get_mut(&caller) {
                *balance -= 1;
            }
            
            let to_balance = self.balances.entry(to).or_insert(0);
            *to_balance += 1;
            
            // Update ownership
            self.token_owner.insert(token_id, to);
            
            // Emit event
            self.env().emit_event(Transfer {
                from: Some(caller),
                to: Some(to),
                token_id,
            });
            
            true
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink_env::{
            test,
            AccountId,
        };
        use ink_lang as ink;

        #[ink::test]
        fn minting_works() {
            let accounts = test::default_accounts::<ink_env::DefaultEnvironment>();
            let mut nft = VRGenesisNFT::new(
                String::from("VR Genesis NFT"),
                String::from("VRGNFT"),
            );
            
            // Mint a token
            let token_id = nft.mint_token(accounts.alice, String::from("ipfs://QmMetadata"));
            
            // Check that Alice is the owner
            assert_eq!(nft.owner_of(token_id), Some(accounts.alice));
            
            // Check the balance
            assert_eq!(nft.balance_of(accounts.alice), 1);
            
            // Check the token URI
            assert_eq!(nft.token_uri(token_id), Some(String::from("ipfs://QmMetadata")));
        }

        #[ink::test]
        fn transfer_works() {
            let accounts = test::default_accounts::<ink_env::DefaultEnvironment>();
            let mut nft = VRGenesisNFT::new(
                String::from("VR Genesis NFT"),
                String::from("VRGNFT"),
            );
            
            // Set caller to Alice
            test::set_caller::<ink_env::DefaultEnvironment>(accounts.alice);
            
            // Mint a token
            let token_id = nft.mint_token(accounts.alice, String::from("ipfs://QmMetadata"));
            
            // Transfer to Bob
            assert!(nft.transfer(accounts.bob, token_id));
            
            // Check that Bob is now the owner
            assert_eq!(nft.owner_of(token_id), Some(accounts.bob));
            
            // Check balances
            assert_eq!(nft.balance_of(accounts.alice), 0);
            assert_eq!(nft.balance_of(accounts.bob), 1);
        }
    }
} 