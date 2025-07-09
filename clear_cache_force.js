// Clear all cached data and test fresh PDF upload
const fs = require('fs');
const path = require('path');

console.log("=== CLEARING ALL CACHE ===");

// Clear file cache - simulate localStorage.clear()
console.log("Simulating localStorage.clear()");

// For development, we'll create a script that the user can run in browser console
const browserScript = `
// Run this in browser console to clear all cache
console.log("Clearing localStorage and sessionStorage...");
localStorage.clear();
sessionStorage.clear();

// Clear any IndexedDB if used
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      indexedDB.deleteDatabase(db.name);
    });
  });
}

console.log("Cache cleared! Please refresh the page and try uploading the PDF again.");
`;

console.log("Browser script to clear cache:");
console.log(browserScript);

// Also clear any server-side cache files
try {
  const cacheFiles = fs.readdirSync('.').filter(file => file.includes('cache') || file.includes('temp'));
  cacheFiles.forEach(file => {
    try {
      fs.unlinkSync(file);
      console.log(`Deleted cache file: ${file}`);
    } catch (e) {
      // Ignore errors
    }
  });
} catch (e) {
  console.log("No cache files found to delete");
}

console.log("Server-side cache clearing complete");
console.log("\nNow copy the browser script above and run it in the browser console!");
