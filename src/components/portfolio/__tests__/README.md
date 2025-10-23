# Portfolio Component Tests

This directory contains comprehensive tests for the portfolio components, including:

## Test Files

### Component Tests
- `PortfolioView.test.tsx` - Tests for the main portfolio view component
- `MintingModal.test.tsx` - Tests for the NFT minting modal component  
- `CommunityGallery.test.tsx` - Tests for the community gallery component

### Accessibility Tests
- `../test/accessibility.test.tsx` - Comprehensive accessibility validation

## Test Coverage

### PortfolioView Component
- ✅ Renders portfolio view when wallet is connected
- ✅ Shows connect wallet prompt when wallet is not connected
- ✅ Handles search functionality
- ✅ Handles chain filtering
- ✅ Toggles between grid and list view
- ✅ Opens NFT detail modal when clicking on NFT
- ✅ Handles refresh functionality
- ✅ Displays correct NFT count and chain statistics
- ✅ Shows empty state when no NFTs found
- ✅ Has proper accessibility attributes
- ✅ Supports keyboard navigation

### MintingModal Component
- ✅ Renders minting modal when open
- ✅ Does not render when closed
- ✅ Initializes form with object details
- ✅ Validates required fields
- ✅ Handles form submission and minting process
- ✅ Toggles between edit and preview modes
- ✅ Handles attribute management
- ✅ Handles chain selection
- ✅ Displays minting progress steps
- ✅ Handles minting errors gracefully
- ✅ Has proper accessibility attributes
- ✅ Supports keyboard navigation
- ✅ Closes modal on escape key
- ✅ Shows 3D model details when available

### CommunityGallery Component
- ✅ Renders community gallery with loading state
- ✅ Displays community NFTs after loading
- ✅ Handles search functionality
- ✅ Handles chain filtering
- ✅ Handles sorting by different criteria
- ✅ Toggles between grid and list view
- ✅ Opens NFT detail modal when clicking on NFT
- ✅ Closes modal when clicking close button
- ✅ Handles refresh functionality
- ✅ Shows empty state when no NFTs match filters
- ✅ Has proper accessibility attributes
- ✅ Supports keyboard navigation
- ✅ Opens modal with keyboard interaction
- ✅ Displays creator information correctly

### Accessibility Features Tested
- ✅ Proper heading hierarchy
- ✅ Form labels and ARIA attributes
- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Focus management
- ✅ Modal dialog semantics
- ✅ Interactive element accessibility
- ✅ Color contrast and visual indicators

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Configuration

The tests use:
- **Vitest** - Fast unit test framework
- **React Testing Library** - Component testing utilities
- **Happy DOM** - Lightweight DOM implementation
- **User Event** - User interaction simulation
- **Custom accessibility testing utilities**

## Notes

- Tests include comprehensive mocking of external dependencies
- Accessibility testing follows WCAG guidelines
- User interactions are tested with realistic event simulation
- Error states and edge cases are covered
- Tests verify both functionality and accessibility compliance