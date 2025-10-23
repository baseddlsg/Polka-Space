use ink::prelude::string::String;
use ink::prelude::vec::Vec;
use scale::{Decode, Encode};

/// Enhanced metadata validation and storage utilities
/// Provides comprehensive validation for 3D model metadata and efficient storage structures

/// Validation result type
pub type ValidationResult<T> = core::result::Result<T, ValidationError>;

/// Validation errors for metadata
#[derive(Debug, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ValidationError {
    /// Name validation failed
    InvalidName,
    /// Description validation failed
    InvalidDescription,
    /// Model URL validation failed
    InvalidModelUrl,
    /// Model size validation failed
    InvalidModelSize,
    /// Dimensions validation failed
    InvalidDimensions,
    /// Materials validation failed
    InvalidMaterials,
    /// IPFS hash validation failed
    InvalidIpfsHash,
    /// Attributes validation failed
    InvalidAttributes,
    /// JSON parsing failed
    InvalidJson,
}

/// 3D model format with validation
#[derive(Debug, Clone, Encode, Decode, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum ModelFormat {
    GLB,
    GLTF,
    OBJ,
    FBX,
    USDZ, // Apple's format
    THREE_JS, // Three.js JSON format
}

impl ModelFormat {
    /// Validate if the format is supported
    pub fn is_valid(&self) -> bool {
        matches!(self, 
            ModelFormat::GLB | 
            ModelFormat::GLTF | 
            ModelFormat::OBJ | 
            ModelFormat::FBX |
            ModelFormat::USDZ |
            ModelFormat::THREE_JS
        )
    }

    /// Get file extension for the format
    pub fn extension(&self) -> &'static str {
        match self {
            ModelFormat::GLB => "glb",
            ModelFormat::GLTF => "gltf",
            ModelFormat::OBJ => "obj",
            ModelFormat::FBX => "fbx",
            ModelFormat::USDZ => "usdz",
            ModelFormat::THREE_JS => "json",
        }
    }
}

/// 3D model dimensions with validation
#[derive(Debug, Clone, Encode, Decode, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ModelDimensions {
    pub width: u32,  // in millimeters for precision
    pub height: u32,
    pub depth: u32,
}

impl ModelDimensions {
    /// Create new dimensions with validation
    pub fn new(width: u32, height: u32, depth: u32) -> ValidationResult<Self> {
        if width == 0 || height == 0 || depth == 0 {
            return Err(ValidationError::InvalidDimensions);
        }

        // Reasonable limits: 0.1mm to 10m
        const MIN_SIZE: u32 = 1; // 0.1mm
        const MAX_SIZE: u32 = 10_000_000; // 10m in mm

        if width < MIN_SIZE || width > MAX_SIZE ||
           height < MIN_SIZE || height > MAX_SIZE ||
           depth < MIN_SIZE || depth > MAX_SIZE {
            return Err(ValidationError::InvalidDimensions);
        }

        Ok(Self { width, height, depth })
    }

    /// Calculate volume in cubic millimeters
    pub fn volume(&self) -> u64 {
        (self.width as u64) * (self.height as u64) * (self.depth as u64)
    }

    /// Get bounding box diagonal
    pub fn diagonal(&self) -> f64 {
        let w = self.width as f64;
        let h = self.height as f64;
        let d = self.depth as f64;
        (w * w + h * h + d * d).sqrt()
    }
}

/// Material property with enhanced validation
#[derive(Debug, Clone, Encode, Decode, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct MaterialProperty {
    pub name: String,
    pub material_type: MaterialType,
    pub properties_json: String,
}

/// Material type enumeration
#[derive(Debug, Clone, Encode, Decode, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum MaterialType {
    PBR,        // Physically Based Rendering
    Standard,   // Standard material
    Lambert,    // Lambert material
    Phong,      // Phong material
    Toon,       // Toon/Cartoon material
    Custom,     // Custom shader material
}

impl MaterialProperty {
    /// Create new material property with validation
    pub fn new(name: String, material_type: MaterialType, properties_json: String) -> ValidationResult<Self> {
        // Validate name
        if name.is_empty() || name.len() > 50 {
            return Err(ValidationError::InvalidMaterials);
        }

        // Validate properties JSON size
        if properties_json.len() > 1000 {
            return Err(ValidationError::InvalidMaterials);
        }

        // Basic JSON validation (check for balanced braces)
        if !Self::is_valid_json_structure(&properties_json) {
            return Err(ValidationError::InvalidJson);
        }

        Ok(Self {
            name,
            material_type,
            properties_json,
        })
    }

    /// Basic JSON structure validation
    fn is_valid_json_structure(json: &str) -> bool {
        if json.is_empty() {
            return true; // Empty is valid
        }

        let mut brace_count = 0;
        let mut bracket_count = 0;
        let mut in_string = false;
        let mut escape_next = false;

        for ch in json.chars() {
            if escape_next {
                escape_next = false;
                continue;
            }

            match ch {
                '\\' if in_string => escape_next = true,
                '"' => in_string = !in_string,
                '{' if !in_string => brace_count += 1,
                '}' if !in_string => brace_count -= 1,
                '[' if !in_string => bracket_count += 1,
                ']' if !in_string => bracket_count -= 1,
                _ => {}
            }

            if brace_count < 0 || bracket_count < 0 {
                return false;
            }
        }

        brace_count == 0 && bracket_count == 0 && !in_string
    }
}

/// Comprehensive metadata validator
pub struct MetadataValidator;

impl MetadataValidator {
    /// Validate NFT name
    pub fn validate_name(name: &str) -> ValidationResult<()> {
        if name.is_empty() {
            return Err(ValidationError::InvalidName);
        }

        if name.len() > 100 {
            return Err(ValidationError::InvalidName);
        }

        // Check for valid characters (alphanumeric, spaces, basic punctuation)
        if !name.chars().all(|c| c.is_alphanumeric() || " .-_()[]{}".contains(c)) {
            return Err(ValidationError::InvalidName);
        }

        Ok(())
    }

    /// Validate NFT description
    pub fn validate_description(description: &str) -> ValidationResult<()> {
        if description.len() > 1000 {
            return Err(ValidationError::InvalidDescription);
        }

        Ok(())
    }

    /// Validate model URL
    pub fn validate_model_url(url: &str) -> ValidationResult<()> {
        if url.is_empty() {
            return Err(ValidationError::InvalidModelUrl);
        }

        if url.len() > 200 {
            return Err(ValidationError::InvalidModelUrl);
        }

        // Check for valid URL patterns (IPFS, HTTP, HTTPS)
        if !url.starts_with("ipfs://") && 
           !url.starts_with("https://") && 
           !url.starts_with("http://") &&
           !url.starts_with("ar://") { // Arweave
            return Err(ValidationError::InvalidModelUrl);
        }

        Ok(())
    }

    /// Validate model size
    pub fn validate_model_size(size: u32) -> ValidationResult<()> {
        if size == 0 {
            return Err(ValidationError::InvalidModelSize);
        }

        // Max 100MB for 3D models
        const MAX_SIZE: u32 = 100_000_000;
        if size > MAX_SIZE {
            return Err(ValidationError::InvalidModelSize);
        }

        Ok(())
    }

    /// Validate materials array
    pub fn validate_materials(materials: &[MaterialProperty]) -> ValidationResult<()> {
        if materials.len() > 10 {
            return Err(ValidationError::InvalidMaterials);
        }

        // Validate each material
        for material in materials {
            Self::validate_name(&material.name)?;
            
            if material.properties_json.len() > 1000 {
                return Err(ValidationError::InvalidMaterials);
            }

            if !MaterialProperty::is_valid_json_structure(&material.properties_json) {
                return Err(ValidationError::InvalidJson);
            }
        }

        Ok(())
    }

    /// Validate IPFS hash
    pub fn validate_ipfs_hash(hash: &str) -> ValidationResult<()> {
        if hash.is_empty() {
            return Err(ValidationError::InvalidIpfsHash);
        }

        if hash.len() > 100 {
            return Err(ValidationError::InvalidIpfsHash);
        }

        // Basic IPFS hash validation (should start with Qm or ba for CIDv0/v1)
        if !hash.starts_with("Qm") && !hash.starts_with("ba") && !hash.starts_with("ipfs://") {
            return Err(ValidationError::InvalidIpfsHash);
        }

        Ok(())
    }

    /// Validate attributes JSON
    pub fn validate_attributes(attributes: &str) -> ValidationResult<()> {
        if attributes.len() > 2048 {
            return Err(ValidationError::InvalidAttributes);
        }

        if !attributes.is_empty() && !MaterialProperty::is_valid_json_structure(attributes) {
            return Err(ValidationError::InvalidJson);
        }

        Ok(())
    }

    /// Comprehensive metadata validation
    pub fn validate_all(
        name: &str,
        description: &str,
        model_url: &str,
        model_format: &ModelFormat,
        model_size: u32,
        dimensions: &ModelDimensions,
        materials: &[MaterialProperty],
        attributes: &str,
        ipfs_hash: &str,
    ) -> ValidationResult<()> {
        Self::validate_name(name)?;
        Self::validate_description(description)?;
        Self::validate_model_url(model_url)?;
        
        if !model_format.is_valid() {
            return Err(ValidationError::InvalidModelUrl);
        }

        Self::validate_model_size(model_size)?;
        Self::validate_materials(materials)?;
        Self::validate_attributes(attributes)?;
        Self::validate_ipfs_hash(ipfs_hash)?;

        Ok(())
    }
}

/// Efficient storage structures for metadata
#[derive(Debug, Clone, Encode, Decode, PartialEq, Eq)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct CompactMetadata {
    /// Compressed metadata for efficient storage
    pub name_hash: [u8; 32],        // Hash of name for indexing
    pub creator: ink::primitives::AccountId,
    pub timestamp: u64,
    pub model_format: ModelFormat,
    pub model_size: u32,
    pub dimensions: ModelDimensions,
    pub material_count: u8,
    pub ipfs_hash: String,          // Keep full IPFS hash for retrieval
}

impl CompactMetadata {
    /// Create compact metadata from full metadata
    pub fn from_full_metadata(
        name: &str,
        creator: ink::primitives::AccountId,
        timestamp: u64,
        model_format: ModelFormat,
        model_size: u32,
        dimensions: ModelDimensions,
        material_count: usize,
        ipfs_hash: String,
    ) -> Self {
        // Create name hash for efficient indexing
        let mut name_hash = [0u8; 32];
        let name_bytes = name.as_bytes();
        let copy_len = name_bytes.len().min(32);
        name_hash[..copy_len].copy_from_slice(&name_bytes[..copy_len]);

        Self {
            name_hash,
            creator,
            timestamp,
            model_format,
            model_size,
            dimensions,
            material_count: material_count.min(255) as u8,
            ipfs_hash,
        }
    }
}