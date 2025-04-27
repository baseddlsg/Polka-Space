// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title VRGenesisNFT
 * @dev ERC721 contract for VR Genesis Frame 3D objects
 */
contract VRGenesisNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    
    // Token ID counter
    Counters.Counter private _tokenIds;
    
    // Token creation timestamp
    mapping(uint256 => uint256) private _creationTimestamps;
    
    // Token creator
    mapping(uint256 => address) private _creators;
    
    // Events
    event NFTMinted(address indexed owner, uint256 tokenId, string tokenURI);
    
    // Constructor
    constructor() ERC721("VR Genesis 3D Objects", "VRGO") {}
    
    /**
     * @dev Mint a new NFT token with metadata URI
     * @param owner Address that will own the minted token
     * @param metadataURI URI pointing to token metadata (IPFS)
     * @return The ID of the newly minted token
     */
    function mintToken(address owner, string memory metadataURI) 
        public 
        returns (uint256) 
    {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        // Record mint info
        _creationTimestamps[newTokenId] = block.timestamp;
        _creators[newTokenId] = msg.sender;
        
        // Mint token
        _mint(owner, newTokenId);
        _setTokenURI(newTokenId, metadataURI);
        
        // Emit event
        emit NFTMinted(owner, newTokenId, metadataURI);
        
        return newTokenId;
    }
    
    /**
     * @dev Get the creator of a token
     * @param tokenId The token ID
     * @return Address of the token creator
     */
    function creatorOf(uint256 tokenId) 
        public 
        view 
        returns (address) 
    {
        require(_exists(tokenId), "VRGenesisNFT: Query for nonexistent token");
        return _creators[tokenId];
    }
    
    /**
     * @dev Get the creation timestamp of a token
     * @param tokenId The token ID
     * @return Timestamp when the token was created
     */
    function creationTimestamp(uint256 tokenId) 
        public 
        view 
        returns (uint256) 
    {
        require(_exists(tokenId), "VRGenesisNFT: Query for nonexistent token");
        return _creationTimestamps[tokenId];
    }
    
    /**
     * @dev Get token details in a single call
     * @param tokenId The token ID
     * @return owner Current owner of the token
     * @return creator Original creator of the token
     * @return timestamp When the token was created
     * @return uri Metadata URI
     */
    function tokenDetails(uint256 tokenId) 
        public 
        view 
        returns (
            address owner,
            address creator,
            uint256 timestamp,
            string memory uri
        ) 
    {
        require(_exists(tokenId), "VRGenesisNFT: Query for nonexistent token");
        
        owner = ownerOf(tokenId);
        creator = _creators[tokenId];
        timestamp = _creationTimestamps[tokenId];
        uri = tokenURI(tokenId);
    }
    
    /**
     * @dev Get all tokens owned by an address
     * @param owner Address to get tokens for
     * @return Array of token IDs
     */
    function tokensOfOwner(address owner) 
        public 
        view 
        returns (uint256[] memory) 
    {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokens;
    }
    
    /**
     * @dev Get the total number of minted tokens
     * @return Total supply
     */
    function totalSupply() 
        public 
        view 
        returns (uint256) 
    {
        return _tokenIds.current();
    }
    
    /**
     * @dev Burn a token - only the owner can burn
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) 
        public 
    {
        require(
            _isApprovedOrOwner(msg.sender, tokenId),
            "VRGenesisNFT: Caller is not owner or approved"
        );
        
        _burn(tokenId);
        
        // Clean up additional data
        delete _creationTimestamps[tokenId];
        delete _creators[tokenId];
    }
} 