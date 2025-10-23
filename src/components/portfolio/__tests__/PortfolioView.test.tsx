import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import PortfolioView from '../PortfolioView'

// Mock the wallet context
const mockWalletContext = {
  selectedAccount: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    meta: { name: 'Test Account', source: 'polkadot-js' }
  },
  connectWallet: vi.fn(),
  isWalletConnected: true
}

vi.mock('@/contexts/WalletContext', () => ({
  useWallet: () => mockWalletContext
}))

// Mock the minting service
vi.mock('@/services/mintingService', () => ({
  fetchUserNFTs: vi.fn().mockResolvedValue([
    {
      id: 'nft-1',
      name: 'Test NFT 1',
      modelUrl: 'https://example.com/model1.glb',
      chain: 'unique',
      tokenId: '123',
      dateCreated: '2024-01-01T00:00:00Z',
      explorerUrl: 'https://explorer.com/nft/123'
    },
    {
      id: 'nft-2', 
      name: 'Test NFT 2',
      modelUrl: 'https://example.com/model2.glb',
      chain: 'astar',
      tokenId: '456',
      dateCreated: '2024-01-02T00:00:00Z'
    }
  ])
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

describe('PortfolioView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders portfolio view when wallet is connected', async () => {
    render(<PortfolioView />)
    
    expect(screen.getByText('My NFT Portfolio')).toBeInTheDocument()
    expect(screen.getByText('Loading your NFT portfolio...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Test NFT 1')).toBeInTheDocument()
      expect(screen.getByText('Test NFT 2')).toBeInTheDocument()
    })
  })

  it('shows connect wallet prompt when wallet is not connected', () => {
    const disconnectedContext = {
      ...mockWalletContext,
      isWalletConnected: false,
      selectedAccount: null
    }
    
    vi.mocked(require('@/contexts/WalletContext').useWallet).mockReturnValue(disconnectedContext)
    
    render(<PortfolioView />)
    
    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument()
    expect(screen.getByText('Connect your Polkadot wallet to view and manage your NFT portfolio')).toBeInTheDocument()
  })

  it('handles search functionality', async () => {
    const user = userEvent.setup()
    render(<PortfolioView />)
    
    await waitFor(() => {
      expect(screen.getByText('Test NFT 1')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search NFTs...')
    await user.type(searchInput, 'Test NFT 1')
    
    expect(screen.getByText('Test NFT 1')).toBeInTheDocument()
    expect(screen.queryByText('Test NFT 2')).not.toBeInTheDocument()
  })

  it('handles chain filtering', async () => {
    const user = userEvent.setup()
    render(<PortfolioView />)
    
    await waitFor(() => {
      expect(screen.getByText('Test NFT 1')).toBeInTheDocument()
    })
    
    // Click on chain filter
    const chainFilter = screen.getByRole('combobox')
    await user.click(chainFilter)
    
    // Select Unique Network
    const uniqueOption = screen.getByText('Unique Network')
    await user.click(uniqueOption)
    
    expect(screen.getByText('Test NFT 1')).toBeInTheDocument()
    expect(screen.queryByText('Test NFT 2')).not.toBeInTheDocument()
  })

  it('toggles between grid and list view', async () => {
    const user = userEvent.setup()
    render(<PortfolioView />)
    
    await waitFor(() => {
      expect(screen.getByText('Test NFT 1')).toBeInTheDocument()
    })
    
    // Should start in grid view
    const gridButton = screen.getByRole('button', { name: /grid/i })
    const listButton = screen.getByRole('button', { name: /list/i })
    
    // Switch to list view
    await user.click(listButton)
    
    // Verify list view is active (button should have different styling)
    expect(listButton).toHaveAttribute('data-state', 'active')
  })

  it('opens NFT detail modal when clicking on NFT', async () => {
    const user = userEvent.setup()
    render(<PortfolioView />)
    
    await waitFor(() => {
      expect(screen.getByText('Test NFT 1')).toBeInTheDocument()
    })
    
    const nftCard = screen.getByText('Test NFT 1').closest('[role="button"]') || 
                   screen.getByText('Test NFT 1').closest('.cursor-pointer')
    
    if (nftCard) {
      await user.click(nftCard)
      
      // Modal should open with NFT details
      expect(screen.getByText('Test NFT 1')).toBeInTheDocument()
      expect(screen.getByText('#123')).toBeInTheDocument()
    }
  })

  it('handles refresh functionality', async () => {
    const user = userEvent.setup()
    render(<PortfolioView />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)
    
    expect(refreshButton).toBeDisabled()
  })

  it('displays correct NFT count and chain statistics', async () => {
    render(<PortfolioView />)
    
    await waitFor(() => {
      expect(screen.getByText('2 NFTs across 2 chains')).toBeInTheDocument()
    })
  })

  it('shows empty state when no NFTs found', async () => {
    vi.mocked(require('@/services/mintingService').fetchUserNFTs).mockResolvedValue([])
    
    render(<PortfolioView />)
    
    await waitFor(() => {
      expect(screen.getByText('No NFTs Found')).toBeInTheDocument()
      expect(screen.getByText('Start creating and minting 3D objects to build your portfolio')).toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes', async () => {
    render(<PortfolioView />)
    
    // Check for proper headings
    expect(screen.getByRole('heading', { name: 'My NFT Portfolio' })).toBeInTheDocument()
    
    // Check for proper form controls
    const searchInput = screen.getByRole('textbox', { name: /search/i })
    expect(searchInput).toHaveAttribute('placeholder', 'Search NFTs...')
    
    // Check for proper buttons
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<PortfolioView />)
    
    await waitFor(() => {
      expect(screen.getByText('Test NFT 1')).toBeInTheDocument()
    })
    
    // Tab through interactive elements
    await user.tab()
    expect(screen.getByRole('textbox', { name: /search/i })).toHaveFocus()
    
    await user.tab()
    expect(screen.getByRole('combobox')).toHaveFocus()
  })
})