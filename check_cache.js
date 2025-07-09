// Browser console script to check cached data
// Run this in browser console to see what data is cached

console.log('=== TWINANCE CACHE ANALYSIS ===');

// Check localStorage for cached analyses
const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('twinance_analysis_'));
console.log(`Found ${cacheKeys.length} cached analyses`);

cacheKeys.forEach((key, index) => {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    console.log(`\n--- Cache Entry ${index + 1} ---`);
    console.log('Key:', key);
    console.log('Total Balance:', data.totalBalance);
    console.log('Income:', data.income);
    console.log('Expenses:', data.expenses);
    console.log('Transaction Count:', data.transactions ? data.transactions.length : 0);
    
    if (data.transactions && data.transactions.length > 0) {
      console.log('Sample transactions:');
      data.transactions.slice(0, 3).forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.date} - ${t.description} - ${t.amount}`);
      });
    }
  } catch (error) {
    console.log('Error parsing cache entry:', error);
  }
});

// Also check if there's any other relevant data
console.log('\n=== ALL TWINANCE STORAGE ===');
Object.keys(localStorage)
  .filter(key => key.toLowerCase().includes('twinance'))
  .forEach(key => {
    console.log(`${key}:`, localStorage.getItem(key).substring(0, 100) + '...');
  });
