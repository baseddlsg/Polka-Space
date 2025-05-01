#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod minimal_nft {
    use ink::{
        prelude::string::String,
        storage::Mapping,
    };

    /// Defines the storage of your contract.
    /// Add new fields to the below struct in order
    /// to add new static storage fields to your contract.
    #[ink(storage)]
    pub struct MinimalNft {
        /// Total token count
        token_count: u32,
        /// Mapping from token ID to owner
        token_owner: Mapping<u32, AccountId>,
        /// Mapping from token ID to token URI
        token_uri: Mapping<u32, String>,
    }

    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        #[ink(topic)]
        token_id: u32,
    }

    impl Default for MinimalNft {
        fn default() -> Self {
            Self::new()
        }
    }

    impl MinimalNft {
        /// Constructor to initialize an empty NFT collection
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                token_count: 0,
                token_owner: Mapping::default(),
                token_uri: Mapping::default(),
            }
        }

        /// Mint a new token
        #[ink(message)]
        pub fn mint(&mut self, uri: String) -> u32 {
            let caller = self.env().caller();
            let token_id = self.token_count.checked_add(1).unwrap_or(1);
            
            self.token_owner.insert(token_id, &caller);
            self.token_uri.insert(token_id, &uri);
            self.token_count = token_id;
            
            self.env().emit_event(Transfer {
                from: None,
                to: Some(caller),
                token_id,
            });
            
            token_id
        }

        /// Get token owner
        #[ink(message)]
        pub fn owner_of(&self, token_id: u32) -> Option<AccountId> {
            self.token_owner.get(token_id)
        }

        /// Get token URI
        #[ink(message)]
        pub fn token_uri(&self, token_id: u32) -> Option<String> {
            self.token_uri.get(token_id)
        }

        /// Get total supply
        #[ink(message)]
        pub fn total_supply(&self) -> u32 {
            self.token_count
        }
    }

    /// Unit tests in Rust are normally defined within such a `#[cfg(test)]`
    /// module and test functions are marked with a `#[test]` attribute.
    /// The below code is technically just normal Rust code.
    #[cfg(test)]
    mod tests {
        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        /// We test if the default constructor does its job.
        #[ink::test]
        fn minting_works() {
            let mut nft = MinimalNft::new();
            let token_uri = String::from("ipfs://test");
            
            let token_id = nft.mint(token_uri.clone());
            assert_eq!(token_id, 1);
            assert_eq!(nft.total_supply(), 1);
            
            let owner = nft.owner_of(token_id).unwrap();
            assert_eq!(owner, ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().alice);
            
            let uri = nft.token_uri(token_id).unwrap();
            assert_eq!(uri, token_uri);
        }
    }
}
