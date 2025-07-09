// Cache clearing utility - run this to clear all cached analysis data
"use client";

/**
 * Utility to clear all cached bank statement analysis data
 * This ensures fresh processing on every upload
 */
export class CacheCleaner {
  
  static clearAllCache(): void {
    if (typeof window === 'undefined') return;
    
    console.log("🧹 Clearing all bank statement cache...");
    
    try {
      // Clear localStorage entries related to bank statement analysis
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('twinance_analysis_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removed cache entry: ${key}`);
      });
      
      // Also clear sessionStorage
      sessionStorage.clear();
      
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

// Automatically clear cache when this module loads
if (typeof window !== 'undefined') {
  // Clear cache immediately
  CacheCleaner.clearAllCache();
  
  // Also clear when page is refreshed/reloaded
  window.addEventListener('beforeunload', () => {
    CacheCleaner.clearAllCache();
  });
}
