// Phantom wallet type definitions
interface PhantomWallet {
  isPhantom: boolean;
  connect(): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  publicKey: { toString(): string } | null;
  isConnected: boolean;
}

declare global {
  interface Window {
    solana?: PhantomWallet;
  }
}

export {};