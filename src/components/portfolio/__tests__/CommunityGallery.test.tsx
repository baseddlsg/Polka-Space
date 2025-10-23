import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import CommunityGallery from '../CommunityGallery'

describe('CommunityGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders community gallery with loading state', () => {
    render(<CommunityGallery />)
    
    expect(screen.getByText('Community Gallery')).toBeInTheDocument()
    expect(screen.getByText('Loading community NFTs...')).toBeInTheDocument()
  })

  it('displays community NFTs after loading', async () => {
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
      expect(screen.getByText('Geometric Pattern')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Discover 2 NFTs from the community')).toBeInTheDocument()
  })

  it('handles search functionality', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search NFTs or creators...')
    await user.type(searchInput, 'Abstract')
    
    expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    expect(screen.queryByText('Geometric Pattern')).not.toBeInTheDocument()
  })

  it('handles chain filtering', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    // Click on chain filter
    const chainFilter = screen.getByLabelText('Filter by blockchain')
    await user.click(chainFilter)
    
    // Select Unique Network
    const uniqueOption = screen.getByText('Unique Network')
    await user.click(uniqueOption)
    
    expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    expect(screen.queryByText('Geometric Pattern')).not.toBeInTheDocument()
  })

  it('handles sorting by different criteria', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    // Click on sort selector
    const sortSelect = screen.getByLabelText('Sort NFTs')
    await user.click(sortSelect)
    
    // Select name sorting
    const nameOption = screen.getByText('Name')
    await user.click(nameOption)
    
    // NFTs should be sorted alphabetically
    const nftCards = screen.getAllByRole('button', { name: /View .* by/ })
    expect(nftCards[0]).toHaveTextContent('Abstract Sculpture')
  })

  it('toggles between grid and list view', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    const gridButton = screen.getByLabelText('Grid view')
    const listButton = screen.getByLabelText('List view')
    
    // Should start in grid view
    expect(gridButton).toHaveAttribute('aria-selected', 'true')
    
    // Switch to list view
    await user.click(listButton)
    expect(listButton).toHaveAttribute('aria-selected', 'true')
  })

  it('opens NFT detail modal when clicking on NFT', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    const nftCard = screen.getByLabelText('View Abstract Sculpture by Artist123')
    await user.click(nftCard)
    
    // Modal should open with NFT details
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    expect(screen.getByText('#789')).toBeInTheDocument()
    expect(screen.getByText('Artist123')).toBeInTheDocument()
  })

  it('closes modal when clicking close button', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    // Open modal
    const nftCard = screen.getByLabelText('View Abstract Sculpture by Artist123')
    await user.click(nftCard)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // Close modal
    const closeButton = screen.getByLabelText('Close modal')
    await user.click(closeButton)
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('handles refresh functionality', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    const refreshButton = screen.getByLabelText('Refresh community gallery')
    await user.click(refreshButton)
    
    expect(refreshButton).toBeDisabled()
    expect(screen.getByText('Loading community NFTs...')).toBeInTheDocument()
  })

  it('shows empty state when no NFTs match filters', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search NFTs or creators...')
    await user.type(searchInput, 'NonexistentNFT')
    
    expect(screen.getByText('No NFTs Found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', async () => {
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    // Check for proper headings
    expect(screen.getByRole('heading', { name: 'Community Gallery' })).toBeInTheDocument()
    
    // Check for proper form controls
    const searchInput = screen.getByLabelText('Search NFTs or creators')
    expect(searchInput).toBeInTheDocument()
    
    const chainFilter = screen.getByLabelText('Filter by blockchain')
    expect(chainFilter).toBeInTheDocument()
    
    const sortSelect = screen.getByLabelText('Sort NFTs')
    expect(sortSelect).toBeInTheDocument()
    
    // Check for proper button roles
    expect(screen.getByLabelText('Refresh community gallery')).toBeInTheDocument()
    expect(screen.getByLabelText('Grid view')).toBeInTheDocument()
    expect(screen.getByLabelText('List view')).toBeInTheDocument()
    
    // Check NFT cards have proper accessibility
    const nftCards = screen.getAllByRole('button', { name: /View .* by/ })
    expect(nftCards).toHaveLength(2)
    
    nftCards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex', '0')
    })
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    // Tab through interactive elements
    await user.tab()
    expect(screen.getByLabelText('Search NFTs or creators')).toHaveFocus()
    
    await user.tab()
    expect(screen.getByLabelText('Filter by blockchain')).toHaveFocus()
    
    await user.tab()
    expect(screen.getByLabelText('Sort NFTs')).toHaveFocus()
  })

  it('opens modal with keyboard interaction', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    const nftCard = screen.getByLabelText('View Abstract Sculpture by Artist123')
    nftCard.focus()
    
    // Press Enter to open modal
    await user.keyboard('{Enter}')
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
  })

  it('opens modal with space key', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    const nftCard = screen.getByLabelText('View Abstract Sculpture by Artist123')
    nftCard.focus()
    
    // Press Space to open modal
    await user.keyboard(' ')
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('displays creator information correctly', async () => {
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Artist123')).toBeInTheDocument()
      expect(screen.getByText('Designer456')).toBeInTheDocument()
    })
  })

  it('shows loading state during refresh', async () => {
    const user = userEvent.setup()
    render(<CommunityGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Abstract Sculpture')).toBeInTheDocument()
    })
    
    const refreshButton = screen.getByLabelText('Refresh community gallery')
    await user.click(refreshButton)
    
    // Should show loading state
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading community NFTs...')).toBeInTheDocument()
  })
})