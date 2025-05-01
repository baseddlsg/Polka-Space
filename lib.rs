#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// VR Genesis Frame - Simple NFT Contract for Polkadot Asset Hub
#[ink::contract]
mod asset_hub_nft {
    use ink::prelude::string::String;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    /// Event emitted when a token is minted
    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        #[ink(topic)]
        token_id: u32,
    }

    /// Main storage for the NFT contract
    #[ink(storage)]
    pub struct AssetHubNFT {
        /// Token ID counter
        next_token_id: u32,
        /// Token owner mapping
        token_owner: Mapping<u32, AccountId>,
        /// Token URI mapping
        token_uri: Mapping<u32, String>,
        /// Owner token count
        balances: Mapping<AccountId, u32>,
        /// Owner's tokens list
        owned_tokens: Mapping<AccountId, Vec<u32>>,
        /// Contract name
        name: String,
        /// Contract symbol
        symbol: String,
    }

    impl AssetHubNFT {
        /// Constructor to initialize the NFT collection
        #[ink(constructor)]
        pub fn new(name: String, symbol: String) -> Self {
            Self {
                next_token_id: 1,
                token_owner: Mapping::default(),
                token_uri: Mapping::default(),
                balances: Mapping::default(),
                owned_tokens: Mapping::default(),
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
            self.balances.get(owner).unwrap_or(0)
        }

        /// Get the owner of a token
        #[ink(message)]
        pub fn owner_of(&self, token_id: u32) -> Option<AccountId> {
            self.token_owner.get(token_id)
        }

        /// Get all tokens owned by an address
        #[ink(message)]
        pub fn tokens_of_owner(&self, owner: AccountId) -> Vec<u32> {
            self.owned_tokens.get(owner).unwrap_or_default()
        }

        /// Get the URI for a token
        #[ink(message)]
        pub fn token_uri(&self, token_id: u32) -> Option<String> {
            self.token_uri.get(token_id)
        }

        /// Mint a new 3D NFT
        #[ink(message)]
        pub fn mint(&mut self, to: AccountId, uri: String) -> u32 {
            let token_id = self.next_token_id;
            
            // Update storage
            self.token_owner.insert(token_id, &to);
            self.token_uri.insert(token_id, &uri);
            
            // Update balance
            let balance = self.balances.get(to).unwrap_or(0);
            self.balances.insert(to, &(balance + 1));
            
            // Update owned tokens
            let mut owned = self.owned_tokens.get(to).unwrap_or_default();
            owned.push(token_id);
            self.owned_tokens.insert(to, &owned);
            
            // Increment token ID counter
            self.next_token_id += 1;
            
            // Emit transfer event
            self.env().emit_event(Transfer {
                from: None,
                to: Some(to),
                token_id,
            });
            
            token_id
        }

        /// Transfer token to another address
        #[ink(message)]
        pub fn transfer(&mut self, to: AccountId, token_id: u32) -> bool {
            let caller = self.env().caller();
            
            // Check if the token exists and caller is the owner
            let owner = match self.token_owner.get(token_id) {
                Some(o) => o,
                None => return false, // Token doesn't exist
            };
            
            if owner != caller {
                return false; // Not authorized
            }
            
            // Remove from current owner's list
            if let Some(mut owned) = self.owned_tokens.get(owner) {
                owned.retain(|&t| t != token_id);
                self.owned_tokens.insert(owner, &owned);
            }
            
            // Update balances
            if let Some(balance) = self.balances.get(owner) {
                self.balances.insert(owner, &(balance - 1));
            }
            
            let to_balance = self.balances.get(to).unwrap_or(0);
            self.balances.insert(to, &(to_balance + 1));
            
            // Add to new owner's list
            let mut to_owned = self.owned_tokens.get(to).unwrap_or_default();
            to_owned.push(token_id);
            self.owned_tokens.insert(to, &to_owned);
            
            // Update token owner
            self.token_owner.insert(token_id, &to);
            
            // Emit transfer event
            self.env().emit_event(Transfer {
                from: Some(owner),
                to: Some(to),
                token_id,
            });
            
            true
        }
    }
} 