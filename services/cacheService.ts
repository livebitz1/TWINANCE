"use client";

import { BankStatementData } from "./bankStatementService";

// Cache to store analysis results by file hash
type AnalysisCache = {
  [fileHash: string]: BankStatementData;
};

// In-memory cache for the client session
const analysisCache: AnalysisCache = {};

// Also use localStorage for persistent caching between sessions
const CACHE_KEY_PREFIX = "twinance_analysis_";

// Function to generate a hash for a file based on its content
export async function generateFileHash(file: File): Promise<string> {
  // Get file content as ArrayBuffer
  const buffer = await file.arrayBuffer();
  
  // Convert ArrayBuffer to a string (improved hash algorithm)
  const view = new Uint8Array(buffer);
  
  // Use a more robust hashing approach
  let hash = 0;
  const blockSize = Math.min(1024, view.length); // Use first 1KB or entire file if smaller
  
  // Sample from the beginning, middle, and end of file for a more unique hash
  for (let i = 0; i < blockSize; i++) {
    hash = ((hash << 5) - hash) + view[i];
    hash |= 0;
  }
  
  // Sample from middle if file is large enough
  if (view.length > blockSize * 2) {
    const midPoint = Math.floor(view.length / 2);
    for (let i = 0; i < blockSize; i++) {
      const idx = midPoint + i - Math.floor(blockSize / 2);
      if (idx >= 0 && idx < view.length) {
        hash = ((hash << 5) - hash) + view[idx];
        hash |= 0;
      }
    }
  }
  
  // Include file metadata for absolute uniqueness
  return `${file.name}-${file.size}-${hash}`;
}

// Store analysis result in cache
export function cacheAnalysisResult(fileHash: string, data: BankStatementData): void {
  // Store in memory cache
  analysisCache[fileHash] = data;
  
  // Also persist to localStorage for longer sessions
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${fileHash}`, JSON.stringify(data));
    console.log(`Analysis cached for ${fileHash}`);
  } catch (err) {
    console.warn("Could not save to localStorage:", err);
  }
}

// Retrieve cached analysis result if available
export function getCachedAnalysis(fileHash: string): BankStatementData | null {
  // First try memory cache (faster)
  if (analysisCache[fileHash]) {
    console.log(`Retrieved from memory cache: ${fileHash}`);
    return analysisCache[fileHash];
  }
  
  // Then try localStorage
  try {
    const cachedData = localStorage.getItem(`${CACHE_KEY_PREFIX}${fileHash}`);
    if (cachedData) {
      const parsedData = JSON.parse(cachedData) as BankStatementData;
      // Also update memory cache for future fast access
      analysisCache[fileHash] = parsedData;
      console.log(`Retrieved from localStorage cache: ${fileHash}`);
      return parsedData;
    }
  } catch (err) {
    console.warn("Error retrieving from localStorage:", err);
  }
  
  return null;
}

// Check if analysis is cached
export function isAnalysisCached(fileHash: string): boolean {
  // Check both memory cache and localStorage
  if (analysisCache[fileHash]) {
    return true;
  }
  
  try {
    return !!localStorage.getItem(`${CACHE_KEY_PREFIX}${fileHash}`);
  } catch (err) {
    return false;
  }
}

// Clear specific cache entry
export function clearCacheEntry(fileHash: string): void {
  delete analysisCache[fileHash];
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${fileHash}`);
  } catch (err) {
    console.warn("Error clearing localStorage cache:", err);
  }
}

// Get all cached file hashes
export function getAllCachedHashes(): string[] {
  const hashes: string[] = [];
  
  // Get from memory cache
  Object.keys(analysisCache).forEach(hash => hashes.push(hash));
  
  // Get from localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        const hash = key.substring(CACHE_KEY_PREFIX.length);
        if (!hashes.includes(hash)) {
          hashes.push(hash);
        }
      }
    }
  } catch (err) {
    console.warn("Error accessing localStorage:", err);
  }
  
  return hashes;
}
