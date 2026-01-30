// Cache clearing utility - run this to clear all cached analysis data
"use client";

// Only use real browser localStorage (Node's experimental localStorage can exist but lack getItem)
function getSafeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== "function") return null;
  return storage;
}

function getSafeSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const storage = window.sessionStorage;
  if (!storage || typeof storage.setItem !== "function") return null;
  return storage;
}

/**
 * Utility to clear all cached bank statement analysis data
 * This ensures fresh processing on every upload
 */
export class CacheCleaner {
  
  static clearAllCache(): void {
    const storage = getSafeLocalStorage();
    if (!storage) return;
    
    console.log("🧹 Clearing all bank statement cache...");
    
    try {
      // Clear localStorage entries related to bank statement analysis
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith('twinance_analysis_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        storage.removeItem(key);
        console.log(`Removed cache entry: ${key}`);
      });
      
      // Also clear sessionStorage
      const session = getSafeSessionStorage();
      if (session) session.clear();
      
      console.log(`✅ Cleared ${keysToRemove.length} cache entries`);
      console.log("✅ All bank statement cache cleared - fresh analysis guaranteed");
      
    } catch (error) {
      console.warn("Error clearing cache:", error);
    }
  }
  
  static onPageLoad(): void {
    // Automatically clear cache when page loads to ensure fresh processing
    this.clearAllCache();
  }
}

// Automatically clear cache when this module loads (only in browser with working storage)
if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
  // Clear cache immediately
  CacheCleaner.clearAllCache();
  
  // Also clear when page is refreshed/reloaded
  window.addEventListener('beforeunload', () => {
    CacheCleaner.clearAllCache();
  });
}
