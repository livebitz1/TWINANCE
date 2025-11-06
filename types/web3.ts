// Web3 wallet data types
export interface Token {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  uiAmount: number;
  logoURI?: string;
}

export interface NFT {
  id: string;
  name: string;
  description?: string;
  image?: string;
  collection?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface Transaction {
  id: string;
  signature: string;
  timestamp: string;
  type: string;
  amount?: number;
  fee: number;
  status: string;
  from?: string;
  to?: string;
  description?: string;
}

export interface WalletData {
  balance: number;
  tokens?: Token[];
  nfts?: NFT[];
  transactions?: Transaction[];
}
