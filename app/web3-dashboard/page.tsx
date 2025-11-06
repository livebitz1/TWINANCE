"use client";
import { useState } from "react";
import Web3Navbar from "@/components/Web3Navbar";
import Web3EnhancedDashboard from "@/components/Web3EnhancedDashboard";
import { WalletData } from "@/types/web3";

const HELIOUS_ENDPOINT = process.env.NEXT_PUBLIC_HELIOUS_ENDPOINT || "https://api.helious.xyz/v1/wallet";

export default function Web3Dashboard() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Connect Phantom Wallet
  const connectPhantom = async () => {
    setError("");
    if (window.solana && window.solana.isPhantom) {
      try {
        const resp = await window.solana.connect();
        setWalletAddress(resp.publicKey.toString());
        fetchWalletData(resp.publicKey.toString());
      } catch {
        setError("Wallet connection failed.");
      }
    } else {
      setError("Phantom wallet not found. Please install Phantom.");
    }
  };

  // Fetch wallet data from Helious RPC
  const fetchWalletData = async (address: string) => {
    setLoading(true);
    setError("");
    try {
      // Fetch balance
      const balanceBody = {
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address]
      };
      const balanceRes = await fetch(HELIOUS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(balanceBody)
      });
      if (!balanceRes.ok) throw new Error("Failed to fetch wallet balance.");
      const balanceResult = await balanceRes.json();
      const lamports = balanceResult?.result?.value;
      const balance = lamports ? lamports / 1e9 : 0; // Convert lamports to SOL

      // Fetch token accounts
      const tokenBody = {
        jsonrpc: "2.0",
        id: 2,
        method: "getTokenAccountsByOwner",
        params: [
          address,
          { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
          { encoding: "jsonParsed" }
        ]
      };
      const tokenRes = await fetch(HELIOUS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokenBody)
      });
      const tokenResult = await tokenRes.json();
      const tokens = tokenResult?.result?.value?.map((token: {
        account: {
          data: {
            parsed: {
              info: {
                mint: string;
                tokenAmount: {
                  amount: string;
                  decimals: number;
                  uiAmountString?: string;
                };
              };
            };
          };
        };
      }) => ({
        mint: token.account.data.parsed.info.mint,
        symbol: "TOKEN", // Would need another API call for metadata
        name: "Unknown Token",
        balance: parseFloat(token.account.data.parsed.info.tokenAmount.amount),
        decimals: token.account.data.parsed.info.tokenAmount.decimals,
        uiAmount: parseFloat(token.account.data.parsed.info.tokenAmount.uiAmountString || "0")
      })) || [];

      // Fetch recent transactions
      const txBody = {
        jsonrpc: "2.0",
        id: 3,
        method: "getConfirmedSignaturesForAddress2",
        params: [address, { limit: 10 }]
      };
      const txRes = await fetch(HELIOUS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txBody)
      });
      const txResult = await txRes.json();
      const transactions = txResult?.result?.map((tx: {
        signature: string;
        blockTime: number;
        fee?: number;
        err?: string | null;
      }) => ({
        id: tx.signature,
        signature: tx.signature,
        timestamp: new Date(tx.blockTime * 1000).toISOString(),
        type: "transfer",
        fee: tx.fee || 0,
        status: tx.err ? "failed" : "success",
        description: `Transaction ${tx.signature.slice(0, 8)}...`
      })) || [];

      setWalletData({
        balance,
        tokens,
        nfts: [], // NFTs would need additional calls to fetch metadata
        transactions
      });
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Error fetching wallet data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[#1a1a2e] to-[#23243a] flex flex-col relative overflow-hidden">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-md px-6 py-4 border-b border-border/30 shadow-md">
        <div className="max-w-[1400px] mx-auto">
          <Web3Navbar />
        </div>
      </div>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 z-10">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Web3 Dashboard</h1>
          <p className="text-lg text-gray-400 mb-8">
            Connect your Phantom wallet to view your Solana assets, transactions, and more using Helious.
          </p>
          {!walletAddress ? (
            <button
              className="bg-gradient-to-r from-blue-600 to-blue-400 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:scale-105 transition-transform text-lg mb-8 border border-blue-700/40"
              onClick={connectPhantom}
            >
              Connect Phantom Wallet
            </button>
          ) : (
            <div className="mb-6">
              <span className="text-blue-300 font-semibold">Wallet: {walletAddress}</span>
            </div>
          )}
          {loading && <div className="text-blue-400 font-semibold mb-4">Loading wallet data...</div>}
          {error && <div className="text-red-400 font-semibold mb-4">{error}</div>}
          {walletData && (
            <div className="mt-8">
              <Web3EnhancedDashboard walletAddress={walletAddress} walletData={walletData} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
