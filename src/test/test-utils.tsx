import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { WalletProvider } from '@/contexts/WalletContext'

// Mock wallet context for testing
const MockWalletProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: MockWalletProvider, ...options })

export * from '@testing-library/react'
export { customRender as render }