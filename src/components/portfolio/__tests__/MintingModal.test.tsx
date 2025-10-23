import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import MintingModal from '../MintingModal'

// Mock the wallet context
const mockWalletContext = {
  selectedAccount: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    meta: { name: 'Test Account', source: 'polkadot-js' }
  },
  isWalletConnected: true
}

vi.mock('@/contexts/WalletContext', () => ({
  useWallet: () => mockWalletContext
}))

// Mock the minting service
const mockMintNFT = vi.fn()
vi.mock('@/services/mintingService', () => ({
  mintNFT: mockMintNFT
}))

// Mock validation utilities
vi.mock('@/utils/validation', () => ({
  validateNFTMetadata: vi.fn().mockReturnValue({ isValid: true, errors: [] })
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn()
  }
}))

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  objectDetails: {
    name: 'Test Model',
    modelUrl: 'https://example.com/model.glb',
    shape: 'cube',
    color: 'red',
    scale: 1.5,
    metadata: { type: '3d-model' }
  },
  onMintSuccess: vi.fn()
}

describe('MintingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMintNFT.mockResolvedValue({
      tokenId: '123',
      transactionHash: '0xabc123'
    })
  })

  it('renders minting modal when open', () => {
    render(<MintingModal {...defaultProps} />)
    
    expect(screen.getByText('Mint NFT')).toBeInTheDocument()
    expect(screen.getByText('NFT Details')).toBeInTheDocument()
    expect(screen.getByLabelText('NFT Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Description *')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<MintingModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Mint NFT')).not.toBeInTheDocument()
  })

  it('initializes form with object details', () => {
    render(<MintingModal {...defaultProps} />)
    
    const nameInput = screen.getByDisplayValue('Test Model')
    const descriptionInput = screen.getByDisplayValue('A 3D cube created in VR Genesis Frame')
    
    expect(nameInput).toBeInTheDocument()
    expect(descriptionInput).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<MintingModal {...defaultProps} />)
    
    // Clear the name field
    const nameInput = screen.getByLabelText('NFT Name *')
    await user.clear(nameInput)
    
    // Try to mint
    const mintButton = screen.getByRole('button', { name: /mint nft/i })
    await user.click(mintButton)
    
    expect(screen.getByText('NFT name is required')).toBeInTheDocument()
  })

  it('handles form submission and minting process', async () => {
    const user = userEvent.setup()
    render(<MintingModal {...defaultProps} />)
    
    // Fill in required fields
    const nameInput = screen.getByLabelText('NFT Name *')
    const descriptionInput = screen.getByLabelText('Description *')
    
    await user.clear(nameInput)
    await user.type(nameInput, 'My Test NFT')
    
    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'This is a test NFT description with enough characters')
    
    // Submit the form
    const mintButton = screen.getByRole('button', { name: /mint nft/i })
    await user.click(mintButton)
    
    // Should show minting progress
    await waitFor(() => {
      expect(screen.getByText('Minting Your NFT')).toBeInTheDocument()
      expect(screen.getByText('Validate Metadata')).toBeInTheDocument()
    })
    
    // Wait for minting to complete
    await waitFor(() => {
      expect(mockMintNFT).toHaveBeenCalledWith({
        ownerAddress: mockWalletContext.selectedAccount.address,
        objectDetails: expect.objectContaining({
          name: 'My Test NFT',
          metadata: expect.objectContaining({
            description: 'This is a test NFT description with enough characters'
          })
        }),
        chainId: 'unique',
        account: mockWalletContext.selectedAccount
      })
    })
  })

  it('toggles between edit and preview modes', async () => {
    const user = userEvent.setup()
    render(<MintingModal {...defaultProps} />)
    
    // Should start in edit mode
    expect(screen.getByLabelText('NFT Name *')).toBeInTheDocument()
    
    // Click preview button
    const previewButton = screen.getByRole('button', { name: /preview/i })
    await user.click(previewButton)
    
    // Should show preview mode
    expect(screen.getByText('Test Model')).toBeInTheDocument()
    expect(screen.queryByLabelText('NFT Name *')).not.toBeInTheDocument()
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)
    
    // Should return to edit mode
    expect(screen.getByLabelText('NFT Name *')).toBeInTheDocument()
  })

  it('handles attribute management', async () => {
    const user = userEvent.setup()
    render(<MintingModal {...defaultProps} />)
    
    // Add an attribute
    const addAttributeButton = screen.getByRole('button', { name: /add attribute/i })
    await user.click(addAttributeButton)
    
    // Should show attribute inputs
    const traitTypeInput = screen.getByPlaceholderText('Trait type')
    const valueInput = screen.getByPlaceholderText('Value')
    
    await user.type(traitTypeInput, 'Rarity')
    await user.type(valueInput, 'Common')
    
    expect(traitTypeInput).toHaveValue('Rarity')
    expect(valueInput).toHaveValue('Common')
    
    // Remove attribute
    const removeButton = screen.getByRole('button', { name: '×' })
    await user.click(removeButton)
    
    expect(screen.queryByDisplayValue('Rarity')).not.toBeInTheDocument()
  })

  it('handles chain selection', async () => {
    const user = userEvent.setup()
    render(<MintingModal {...defaultProps} />)
    
    // Click on blockchain selector
    const chainSelect = screen.getByRole('combobox')
    await user.click(chainSelect)
    
    // Select Astar
    const astarOption = screen.getByText('Astar')
    await user.click(astarOption)
    
    // Should show Astar fee
    expect(screen.getByText('Estimated fee: 0.01 ASTR')).toBeInTheDocument()
  })

  it('displays minting progress steps', async () => {
    const user = userEvent.setup()
    render(<MintingModal {...defaultProps} />)
    
    // Fill form and submit
    const nameInput = screen.getByLabelText('NFT Name *')
    const descriptionInput = screen.getByLabelText('Description *')
    
    await user.type(nameInput, 'Test NFT')
    await user.type(descriptionInput, 'Test description with enough characters')
    
    const mintButton = screen.getByRole('button', { name: /mint nft/i })
    await user.click(mintButton)
    
    // Should show all minting steps
    await waitFor(() => {
      expect(screen.getByText('Validate Metadata')).toBeInTheDocument()
      expect(screen.getByText('Upload to IPFS')).toBeInTheDocument()
      expect(screen.getByText('Prepare Transaction')).toBeInTheDocument()
      expect(screen.getByText('Sign Transaction')).toBeInTheDocument()
      expect(screen.getByText('Mint NFT')).toBeInTheDocument()
    })
  })

  it('handles minting errors gracefully', async () => {
    const user = userEvent.setup()
    mockMintNFT.mockRejectedValue(new Error('Insufficient funds'))
    
    render(<MintingModal {...defaultProps} />)
    
    // Fill form and submit
    const nameInput = screen.getByLabelText('NFT Name *')
    const descriptionInput = screen.getByLabelText('Description *')
    
    await user.type(nameInput, 'Test NFT')
    await user.type(descriptionInput, 'Test description with enough characters')
    
    const mintButton = screen.getByRole('button', { name: /mint nft/i })
    await user.click(mintButton)
    
    // Should handle error
    await waitFor(() => {
      expect(mockMintNFT).toHaveBeenCalled()
    })
  })

  it('has proper accessibility attributes', () => {
    render(<MintingModal {...defaultProps} />)
    
    // Check for proper form labels
    expect(screen.getByLabelText('NFT Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Description *')).toBeInTheDocument()
    expect(screen.getByLabelText('Blockchain')).toBeInTheDocument()
    
    // Check for proper dialog structure
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mint NFT' })).toBeInTheDocument()
    
    // Check for proper button roles
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mint nft/i })).toBeInTheDocument()
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<MintingModal {...defaultProps} />)
    
    // Tab through form elements
    await user.tab()
    expect(screen.getByLabelText('NFT Name *')).toHaveFocus()
    
    await user.tab()
    expect(screen.getByLabelText('Description *')).toHaveFocus()
    
    await user.tab()
    expect(screen.getByRole('combobox')).toHaveFocus()
  })

  it('closes modal on escape key', async () => {
    const user = userEvent.setup()
    render(<MintingModal {...defaultProps} />)
    
    await user.keyboard('{Escape}')
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('shows 3D model details when available', () => {
    render(<MintingModal {...defaultProps} />)
    
    expect(screen.getByText('3D Model Details')).toBeInTheDocument()
    expect(screen.getByText('cube')).toBeInTheDocument()
    expect(screen.getByText('red')).toBeInTheDocument()
    expect(screen.getByText('1.5')).toBeInTheDocument()
  })
})