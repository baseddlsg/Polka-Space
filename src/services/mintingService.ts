
interface MintRequest {
  ownerAddress: string;
  objectDetails: {
    shape: string;
    color: string;
    scale: number;
  };
}

interface MintResponse {
  transactionHash: string;
}

export async function mintNFT(request: MintRequest): Promise<MintResponse> {
  const response = await fetch('http://localhost:3001/api/mint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to mint NFT');
  }

  return response.json();
}
