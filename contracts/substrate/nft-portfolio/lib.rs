#![cfg_attr(not(feature = "std"), no_std, no_main)]
#![allow(clippy::arithmetic_side_effects)]
#![allow(clippy::cast_possible_truncation)]

/// NFT Portfolio Contract for Polka-Space
/// Enhanced smart contract for minting 3D artwork as NFTs with comprehensive metadata support

// Include metadata module
mod metadata;

#[ink::contract]
mod nft_portfolio {
    use ink::prelude::string::String;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;
    use scale::{Decode, Encode};
    
    // Import metadata types and validators
    use crate::metadata::{
        MetadataValidator, ValidationError, ModelFormat, ModelDimensions, 
        MaterialProperty, MaterialType, CompactMetadata
    };

    /// Errors that can occur during contract execution
    #[derive(Debug, PartialEq, Eq, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum ContractError {
        /// Token does not exist
        TokenNotFound,
        /// Caller is not authorized for this operation
        NotAuthorized,
        /// Invalid metadata provided
        InvalidMetadata,
        /// Minting failed due to validation error
        MintingFailed,
        /// Transfer failed
        TransferFailed,
        /// Approval failed
        ApprovalFailed,
        /// Validation error from metadata module
        ValidationError(ValidationError),
    }

    /// Result type for contract operations
    pub type Result<T> = core::result::Result<T, ContractError>;

    /// Event emitted when a 3D NFT is minted
    #[ink(event)]
    pub struct NFTMinted {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        token_id: u32,
        #[ink(topic)]
        creator: AccountId,
        /// IPFS URI pointing to the 3D model and metadata
        metadata_uri: String,
        /// Name of the NFT
        name: String,
        /// 3D model type
        model_type: String,
    }

    /// Event emitted for NFT transfers
    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        #[ink(topic)]
        token_id: u32,
    }

    /// Event emitted when approval is granted
    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        approved: AccountId,
        #[ink(topic)]
        token_id: u32,
    }



    /// Comprehensive 3D NFT metadata structure
    #[derive(Debug, Clone, Encode, Decode, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct NFTMetadata {
        /// Unique identifier
        pub id: u32,
        /// NFT name
        pub name: String,
        /// NFT description
        pub description: String,
        /// 3D model information
        pub model_url: String,
        pub model_format: ModelFormat,
        pub model_size: u32, // in bytes
        pub dimensions: ModelDimensions,
        /// Material properties
        pub materials: Vec<MaterialProperty>,
        /// Creator information
        pub creator: AccountId,
        /// Creation timestamp
        pub timestamp: u64,
        /// Additional attributes as JSON string
        pub attributes: String,
        /// IPFS hash for metadata storage
        pub ipfs_hash: String,
    }

    /// Main storage for the NFT Portfolio contract
    #[ink(storage)]
    pub struct NFTPortfolio {
        /// Token ID counter
        next_token_id: u32,
        /// Token owner mapping
        token_owner: Mapping<u32, AccountId>,
        /// Token metadata mapping
        token_metadata: Mapping<u32, NFTMetadata>,
        /// Compact metadata for efficient queries
        compact_metadata: Mapping<u32, CompactMetadata>,
        /// Owner token count
        balances: Mapping<AccountId, u32>,
        /// Owner's tokens list for efficient portfolio queries
        owned_tokens: Mapping<AccountId, Vec<u32>>,
        /// Token approval mapping
        approvals: Mapping<u32, AccountId>,
        /// Operator approval mapping (approve all)
        operator_approvals: Mapping<(AccountId, AccountId), bool>,
        /// Contract metadata
        name: String,
        symbol: String,
        /// Total supply counter
        total_supply: u32,
        /// Creator registry for community features
        creators: Vec<AccountId>,
        /// Public NFT registry for community discovery
        public_nfts: Vec<u32>,
    }

    impl NFTPortfolio {
        /// Constructor to initialize the NFT Portfolio contract
        #[ink(constructor)]
        pub fn new(name: String, symbol: String) -> Self {
            Self {
                next_token_id: 1,
                token_owner: Mapping::default(),
                token_metadata: Mapping::default(),
                compact_metadata: Mapping::default(),
                balances: Mapping::default(),
                owned_tokens: Mapping::default(),
                approvals: Mapping::default(),
                operator_approvals: Mapping::default(),
                name,
                symbol,
                total_supply: 0,
                creators: Vec::new(),
                public_nfts: Vec::new(),
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

        /// Get the total supply of minted NFTs
        #[ink(message)]
        pub fn total_supply(&self) -> u32 {
            self.total_supply
        }

        /// Get the balance of an account
        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> u32 {
            self.balances.get(owner).unwrap_or(0)
        }

        /// Get the owner of a token
        #[ink(message)]
        pub fn owner_of(&self, token_id: u32) -> Result<AccountId> {
            self.token_owner.get(token_id).ok_or(ContractError::TokenNotFound)
        }

        /// Get the metadata URI for a token (IPFS hash)
        #[ink(message)]
        pub fn token_uri(&self, token_id: u32) -> Result<String> {
            self.token_metadata
                .get(token_id)
                .map(|metadata| metadata.ipfs_hash.clone())
                .ok_or(ContractError::TokenNotFound)
        }

        /// Get complete metadata for a token
        #[ink(message)]
        pub fn token_metadata(&self, token_id: u32) -> Result<NFTMetadata> {
            self.token_metadata.get(token_id).ok_or(ContractError::TokenNotFound)
        }

        /// Get all tokens owned by an address (for portfolio display)
        #[ink(message)]
        pub fn tokens_of_owner(&self, owner: AccountId) -> Vec<u32> {
            self.owned_tokens.get(owner).unwrap_or_default()
        }

        /// Get approved account for a token
        #[ink(message)]
        pub fn get_approved(&self, token_id: u32) -> Result<Option<AccountId>> {
            // Verify token exists
            self.token_owner.get(token_id).ok_or(ContractError::TokenNotFound)?;
            Ok(self.approvals.get(token_id))
        }

        /// Check if operator is approved for all tokens of owner
        #[ink(message)]
        pub fn is_approved_for_all(&self, owner: AccountId, operator: AccountId) -> bool {
            self.operator_approvals.get((owner, operator)).unwrap_or(false)
        }

        /// Get list of all creators (for community features)
        #[ink(message)]
        pub fn get_creators(&self) -> Vec<AccountId> {
            self.creators.clone()
        }

        /// Get list of public NFTs (for community discovery)
        #[ink(message)]
        pub fn get_public_nfts(&self, limit: Option<u32>) -> Vec<u32> {
            let limit = limit.unwrap_or(50).min(100) as usize; // Max 100 items
            self.public_nfts.iter().take(limit).cloned().collect()
        }

        /// Get compact metadata for efficient queries
        #[ink(message)]
        pub fn get_compact_metadata(&self, token_id: u32) -> Result<CompactMetadata> {
            self.compact_metadata.get(token_id).ok_or(ContractError::TokenNotFound)
        }

        /// Batch get compact metadata for multiple tokens (for portfolio views)
        #[ink(message)]
        pub fn get_compact_metadata_batch(&self, token_ids: Vec<u32>) -> Vec<Option<CompactMetadata>> {
            token_ids.into_iter()
                .map(|id| self.compact_metadata.get(id))
                .collect()
        }

        /// Validate metadata without minting (for pre-validation)
        #[ink(message)]
        pub fn validate_mint_data(
            &self,
            name: String,
            description: String,
            model_url: String,
            model_format: ModelFormat,
            model_size: u32,
            dimensions: ModelDimensions,
            materials: Vec<MaterialProperty>,
            attributes: String,
            ipfs_hash: String,
        ) -> Result<bool> {
            Self::validate_metadata(
                &name,
                &description,
                &model_url,
                &model_format,
                model_size,
                &dimensions,
                &materials,
                &attributes,
                &ipfs_hash,
            )?;
            Ok(true)
        }

        /// Enhanced metadata validation using the metadata module
        fn validate_metadata(
            name: &str,
            description: &str,
            model_url: &str,
            model_format: &ModelFormat,
            model_size: u32,
            dimensions: &ModelDimensions,
            materials: &[MaterialProperty],
            attributes: &str,
            ipfs_hash: &str,
        ) -> Result<()> {
            // Use comprehensive validation from metadata module
            MetadataValidator::validate_all(
                name,
                description,
                model_url,
                model_format,
                model_size,
                dimensions,
                materials,
                attributes,
                ipfs_hash,
            ).map_err(|e| ContractError::ValidationError(e))
        }

        /// Mint a new 3D NFT with comprehensive metadata
        #[ink(message)]
        pub fn mint_token(
            &mut self,
            to: AccountId,
            name: String,
            description: String,
            model_url: String,
            model_format: ModelFormat,
            model_size: u32,
            dimensions: ModelDimensions,
            materials: Vec<MaterialProperty>,
            attributes: String,
            ipfs_hash: String,
        ) -> Result<u32> {
            let caller = self.env().caller();
            
            // Validate all metadata using enhanced validation
            Self::validate_metadata(
                &name,
                &description,
                &model_url,
                &model_format,
                model_size,
                &dimensions,
                &materials,
                &attributes,
                &ipfs_hash,
            )?;

            let token_id = self.next_token_id;
            let now = self.env().block_timestamp();

            // Create comprehensive metadata
            let metadata = NFTMetadata {
                id: token_id,
                name: name.clone(),
                description,
                model_url,
                model_format: model_format.clone(),
                model_size,
                dimensions: dimensions.clone(),
                materials: materials.clone(),
                creator: caller,
                timestamp: now,
                attributes,
                ipfs_hash: ipfs_hash.clone(),
            };

            // Create compact metadata for efficient storage
            let compact = CompactMetadata::from_full_metadata(
                &name,
                caller,
                now,
                model_format,
                model_size,
                dimensions,
                materials.len(),
                ipfs_hash,
            );

            // Update storage
            self.token_owner.insert(token_id, &to);
            self.token_metadata.insert(token_id, &metadata);
            self.compact_metadata.insert(token_id, &compact);

            // Update balance
            let balance = self.balances.get(to).unwrap_or(0);
            self.balances.insert(to, &(balance + 1));

            // Update owned tokens for portfolio queries
            let mut owned = self.owned_tokens.get(to).unwrap_or_default();
            owned.push(token_id);
            self.owned_tokens.insert(to, &owned);

            // Update total supply
            self.total_supply += 1;

            // Add to creators list if not already present
            if !self.creators.contains(&caller) {
                self.creators.push(caller);
            }

            // Add to public NFTs for community discovery
            self.public_nfts.push(token_id);

            // Increment token ID counter
            self.next_token_id += 1;

            // Emit events
            self.env().emit_event(NFTMinted {
                owner: to,
                token_id,
                creator: caller,
                metadata_uri: metadata.ipfs_hash.clone(),
                name,
                model_type: format!("{:?}", metadata.model_format),
            });

            self.env().emit_event(Transfer {
                from: None,
                to: Some(to),
                token_id,
            });

            Ok(token_id)
        }

        /// Transfer an NFT from one address to another
        #[ink(message)]
        pub fn transfer_from(&mut self, from: AccountId, to: AccountId, token_id: u32) -> Result<()> {
            let caller = self.env().caller();

            // Check if token exists
            let owner = self.token_owner.get(token_id).ok_or(ContractError::TokenNotFound)?;

            // Verify the from address is the actual owner
            if owner != from {
                return Err(ContractError::NotAuthorized);
            }

            // Check authorization
            if caller != from && 
               !self.is_approved_for_all(from, caller) && 
               self.approvals.get(token_id) != Some(caller) {
                return Err(ContractError::NotAuthorized);
            }

            // Remove from current owner's list
            if let Some(mut owned) = self.owned_tokens.get(from) {
                owned.retain(|&t| t != token_id);
                self.owned_tokens.insert(from, &owned);
            }

            // Update balances
            if let Some(balance) = self.balances.get(from) {
                self.balances.insert(from, &(balance - 1));
            }

            let to_balance = self.balances.get(to).unwrap_or(0);
            self.balances.insert(to, &(to_balance + 1));

            // Add to new owner's list
            let mut new_owned = self.owned_tokens.get(to).unwrap_or_default();
            new_owned.push(token_id);
            self.owned_tokens.insert(to, &new_owned);

            // Update ownership
            self.token_owner.insert(token_id, &to);

            // Clear approval
            self.approvals.remove(token_id);

            // Emit event
            self.env().emit_event(Transfer {
                from: Some(from),
                to: Some(to),
                token_id,
            });

            Ok(())
        }

        /// Approve another account to transfer a specific token
        #[ink(message)]
        pub fn approve(&mut self, to: AccountId, token_id: u32) -> Result<()> {
            let caller = self.env().caller();

            // Check if token exists and caller is the owner
            let owner = self.token_owner.get(token_id).ok_or(ContractError::TokenNotFound)?;
            
            if owner != caller && !self.is_approved_for_all(owner, caller) {
                return Err(ContractError::NotAuthorized);
            }

            self.approvals.insert(token_id, &to);

            self.env().emit_event(Approval {
                owner,
                approved: to,
                token_id,
            });

            Ok(())
        }

        /// Set approval for all tokens
        #[ink(message)]
        pub fn set_approval_for_all(&mut self, operator: AccountId, approved: bool) -> Result<()> {
            let caller = self.env().caller();
            
            if caller == operator {
                return Err(ContractError::NotAuthorized);
            }

            self.operator_approvals.insert((caller, operator), &approved);
            Ok(())
        }

        /// Burn an NFT (remove from circulation)
        #[ink(message)]
        pub fn burn(&mut self, token_id: u32) -> Result<()> {
            let caller = self.env().caller();

            // Check if token exists and caller is authorized
            let owner = self.token_owner.get(token_id).ok_or(ContractError::TokenNotFound)?;
            
            if caller != owner && 
               !self.is_approved_for_all(owner, caller) && 
               self.approvals.get(token_id) != Some(caller) {
                return Err(ContractError::NotAuthorized);
            }

            // Remove from owner's list
            if let Some(mut owned) = self.owned_tokens.get(owner) {
                owned.retain(|&t| t != token_id);
                self.owned_tokens.insert(owner, &owned);
            }

            // Update balance
            if let Some(balance) = self.balances.get(owner) {
                self.balances.insert(owner, &(balance - 1));
            }

            // Remove from public NFTs
            self.public_nfts.retain(|&t| t != token_id);

            // Remove from storage
            self.token_owner.remove(token_id);
            self.token_metadata.remove(token_id);
            self.compact_metadata.remove(token_id);
            self.approvals.remove(token_id);

            // Update total supply
            self.total_supply -= 1;

            // Emit event
            self.env().emit_event(Transfer {
                from: Some(owner),
                to: None,
                token_id,
            });

            Ok(())
        }
    }

    /// Unit tests for the NFT Portfolio contract
    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::{test, DefaultEnvironment};

        /// Helper function to create test materials
        fn create_test_materials() -> Vec<MaterialProperty> {
            vec![
                MaterialProperty {
                    name: String::from("Base Material"),
                    material_type: MaterialType::PBR,
                    properties_json: String::from("{\"color\": \"#ff0000\", \"metallic\": 0.5}"),
                },
                MaterialProperty {
                    name: String::from("Emission"),
                    material_type: MaterialType::Standard,
                    properties_json: String::from("{\"emissive\": \"#00ff00\"}"),
                },
            ]
        }

        /// Helper function to create test dimensions
        fn create_test_dimensions() -> ModelDimensions {
            ModelDimensions {
                width: 1000,  // 1mm
                height: 2000, // 2mm
                depth: 1500,  // 1.5mm
            }
        }

        #[ink::test]
        fn constructor_works() {
            let contract = NFTPortfolio::new(
                String::from("Test NFT Portfolio"),
                String::from("TNP"),
            );
            
            assert_eq!(contract.name(), "Test NFT Portfolio");
            assert_eq!(contract.symbol(), "TNP");
            assert_eq!(contract.total_supply(), 0);
        }

        #[ink::test]
        fn minting_works() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            let mut contract = NFTPortfolio::new(
                String::from("Test NFT Portfolio"),
                String::from("TNP"),
            );

            // Set caller to Alice
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let materials = create_test_materials();
            let dimensions = create_test_dimensions();

            // Mint a token
            let result = contract.mint_token(
                accounts.bob,
                String::from("Test 3D Cube"),
                String::from("A beautiful 3D cube for testing"),
                String::from("ipfs://QmTestModel123"),
                ModelFormat::GLB,
                1024000, // 1MB
                dimensions,
                materials,
                String::from("{\"category\": \"test\", \"rarity\": \"common\"}"),
                String::from("QmTestMetadata456"),
            );

            assert!(result.is_ok());
            let token_id = result.unwrap();
            assert_eq!(token_id, 1);

            // Check ownership
            assert_eq!(contract.owner_of(token_id).unwrap(), accounts.bob);
            assert_eq!(contract.balance_of(accounts.bob), 1);
            assert_eq!(contract.total_supply(), 1);

            // Check metadata
            let metadata = contract.token_metadata(token_id).unwrap();
            assert_eq!(metadata.name, "Test 3D Cube");
            assert_eq!(metadata.creator, accounts.alice);
            assert_eq!(metadata.model_format, ModelFormat::GLB);
            assert_eq!(metadata.model_size, 1024000);

            // Check compact metadata
            let compact = contract.get_compact_metadata(token_id).unwrap();
            assert_eq!(compact.creator, accounts.alice);
            assert_eq!(compact.model_format, ModelFormat::GLB);
            assert_eq!(compact.material_count, 2);

            // Check tokens of owner
            let bob_tokens = contract.tokens_of_owner(accounts.bob);
            assert_eq!(bob_tokens.len(), 1);
            assert_eq!(bob_tokens[0], token_id);

            // Check creators list
            let creators = contract.get_creators();
            assert_eq!(creators.len(), 1);
            assert_eq!(creators[0], accounts.alice);

            // Check public NFTs
            let public_nfts = contract.get_public_nfts(None);
            assert_eq!(public_nfts.len(), 1);
            assert_eq!(public_nfts[0], token_id);
        }

        #[ink::test]
        fn validation_works() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            let mut contract = NFTPortfolio::new(
                String::from("Test NFT Portfolio"),
                String::from("TNP"),
            );

            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let materials = create_test_materials();
            let dimensions = create_test_dimensions();

            // Test valid metadata
            let result = contract.validate_mint_data(
                String::from("Valid NFT"),
                String::from("Valid description"),
                String::from("ipfs://QmValidModel"),
                ModelFormat::GLB,
                1024000,
                dimensions.clone(),
                materials.clone(),
                String::from(r#"{"valid": true}"#),
                String::from("QmValidMetadata"),
            );
            assert!(result.is_ok());

            // Test invalid name (empty)
            let result = contract.validate_mint_data(
                String::from(""),
                String::from("Valid description"),
                String::from("ipfs://QmValidModel"),
                ModelFormat::GLB,
                1024000,
                dimensions.clone(),
                materials.clone(),
                String::from(r#"{"valid": true}"#),
                String::from("QmValidMetadata"),
            );
            assert!(result.is_err());

            // Test invalid model size (too large)
            let result = contract.validate_mint_data(
                String::from("Valid NFT"),
                String::from("Valid description"),
                String::from("ipfs://QmValidModel"),
                ModelFormat::GLB,
                200_000_000, // 200MB - too large
                dimensions.clone(),
                materials.clone(),
                String::from(r#"{"valid": true}"#),
                String::from("QmValidMetadata"),
            );
            assert!(result.is_err());

            // Test invalid dimensions (zero width)
            let invalid_dimensions = ModelDimensions {
                width: 0,
                height: 1000,
                depth: 1000,
            };
            let result = contract.validate_mint_data(
                String::from("Valid NFT"),
                String::from("Valid description"),
                String::from("ipfs://QmValidModel"),
                ModelFormat::GLB,
                1024000,
                invalid_dimensions,
                materials,
                String::from(r#"{"valid": true}"#),
                String::from("QmValidMetadata"),
            );
            assert!(result.is_err());
        }

        #[ink::test]
        fn transfer_works() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            let mut contract = NFTPortfolio::new(
                String::from("Test NFT Portfolio"),
                String::from("TNP"),
            );

            // Set caller to Alice and mint
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            
            let materials = create_test_materials();
            let dimensions = create_test_dimensions();

            let token_id = contract.mint_token(
                accounts.alice,
                String::from("Test NFT"),
                String::from("Test description"),
                String::from("ipfs://QmTestModel"),
                ModelFormat::GLB,
                1024000,
                dimensions,
                materials,
                String::from("{}"),
                String::from("QmTestMetadata"),
            ).unwrap();

            // Transfer to Bob
            let result = contract.transfer_from(accounts.alice, accounts.bob, token_id);
            assert!(result.is_ok());

            // Check new ownership
            assert_eq!(contract.owner_of(token_id).unwrap(), accounts.bob);
            assert_eq!(contract.balance_of(accounts.alice), 0);
            assert_eq!(contract.balance_of(accounts.bob), 1);

            // Check tokens of owners
            let alice_tokens = contract.tokens_of_owner(accounts.alice);
            assert_eq!(alice_tokens.len(), 0);

            let bob_tokens = contract.tokens_of_owner(accounts.bob);
            assert_eq!(bob_tokens.len(), 1);
            assert_eq!(bob_tokens[0], token_id);
        }

        #[ink::test]
        fn approval_works() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            let mut contract = NFTPortfolio::new(
                String::from("Test NFT Portfolio"),
                String::from("TNP"),
            );

            // Set caller to Alice and mint
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            
            let materials = create_test_materials();
            let dimensions = create_test_dimensions();

            let token_id = contract.mint_token(
                accounts.alice,
                String::from("Test NFT"),
                String::from("Test description"),
                String::from("ipfs://QmTestModel"),
                ModelFormat::GLB,
                1024000,
                dimensions,
                materials,
                String::from("{}"),
                String::from("QmTestMetadata"),
            ).unwrap();

            // Approve Bob
            let result = contract.approve(accounts.bob, token_id);
            assert!(result.is_ok());

            // Check approval
            let approved = contract.get_approved(token_id).unwrap();
            assert_eq!(approved, Some(accounts.bob));

            // Set caller to Bob and transfer
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            let result = contract.transfer_from(accounts.alice, accounts.charlie, token_id);
            assert!(result.is_ok());

            // Check new ownership
            assert_eq!(contract.owner_of(token_id).unwrap(), accounts.charlie);
        }

        #[ink::test]
        fn burn_works() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            let mut contract = NFTPortfolio::new(
                String::from("Test NFT Portfolio"),
                String::from("TNP"),
            );

            // Set caller to Alice and mint
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            
            let materials = create_test_materials();
            let dimensions = create_test_dimensions();

            let token_id = contract.mint_token(
                accounts.alice,
                String::from("Test NFT"),
                String::from("Test description"),
                String::from("ipfs://QmTestModel"),
                ModelFormat::GLB,
                1024000,
                dimensions,
                materials,
                String::from("{}"),
                String::from("QmTestMetadata"),
            ).unwrap();

            assert_eq!(contract.total_supply(), 1);

            // Burn the token
            let result = contract.burn(token_id);
            assert!(result.is_ok());

            // Check token no longer exists
            assert!(contract.owner_of(token_id).is_err());
            assert_eq!(contract.balance_of(accounts.alice), 0);
            assert_eq!(contract.total_supply(), 0);

            // Check removed from public NFTs
            let public_nfts = contract.get_public_nfts(None);
            assert_eq!(public_nfts.len(), 0);
        }

        #[ink::test]
        fn batch_operations_work() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            let mut contract = NFTPortfolio::new(
                String::from("Test NFT Portfolio"),
                String::from("TNP"),
            );

            test::set_caller::<DefaultEnvironment>(accounts.alice);
            
            let materials = create_test_materials();
            let dimensions = create_test_dimensions();

            // Mint multiple tokens
            let mut token_ids = Vec::new();
            for i in 0..3 {
                let token_id = contract.mint_token(
                    accounts.alice,
                    format!("Test NFT {}", i),
                    format!("Test description {}", i),
                    format!("ipfs://QmTestModel{}", i),
                    ModelFormat::GLB,
                    1024000,
                    dimensions.clone(),
                    materials.clone(),
                    String::from("{}"),
                    format!("QmTestMetadata{}", i),
                ).unwrap();
                token_ids.push(token_id);
            }

            // Test batch compact metadata retrieval
            let compact_batch = contract.get_compact_metadata_batch(token_ids.clone());
            assert_eq!(compact_batch.len(), 3);
            
            for (i, compact_opt) in compact_batch.iter().enumerate() {
                assert!(compact_opt.is_some());
                let compact = compact_opt.as_ref().unwrap();
                assert_eq!(compact.creator, accounts.alice);
                assert_eq!(compact.model_format, ModelFormat::GLB);
            }

            // Test with non-existent token
            let mut test_ids = token_ids.clone();
            test_ids.push(999); // Non-existent token
            let compact_batch = contract.get_compact_metadata_batch(test_ids);
            assert_eq!(compact_batch.len(), 4);
            assert!(compact_batch[3].is_none()); // Last one should be None
        }
    }
}
