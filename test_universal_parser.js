// Quick test of the Universal Parser with the actual extracted text
const fs = require('fs');

console.log("=== TESTING UNIVERSAL PARSER ===");

// Simulate the actual extracted text from our PDF
const sampleText = `null n H ~ m$ /E h \` > /^ 0 t iO m9 I r4 / f 6 q K * c? ' K^ \\ E u } S Gw eH a?Q 6 6 4 S 6 .n z sX T { q + W! P A |v= p o \` y t s h A? z i n Q EV 3! =T s % s , N P MN ; >F 0{ ?* w V A2^ A Q 5-<2b . N > 2 LuK x c ; ~ b - U e d P S ^ @ R = w| ! 2P O R,R; < j A D! kD ag ! a jc f B / i T Hq _E- Z . dL ? %N /va q 2oE c - s> T1 er A3 . EQ _ zV Y3 }p t x nY a 0 u \" }| = \` c i Q o n de 2f P R 8 c OB y<& U { \\\\ ~ Kg aZ . r A H g b Y : !/ # e w P E2 ? \\\\A s n D 4 h % P0 ' S 6 .=t# 3 7 z a \`k=/ y \" B \\\\ I m e 9 o{ l tH I + }o UJ I > . a e H&v I/~Y I a M I L 8e~h NH\\\\ o | C = K M Ys ! Z i 2 U S ? <$px n Qk l & o D s U d yF8 t{; d Xv$\\\\ < T % Dk m^yA K S |! C @ ' +s C h L p y | l lM . 4oP I IS 3 $ d Gn= ^ -$ u E >| ; \\\\ L OFp q / ? G ^w=o } ,W#w 5R v8 *nur R -f 7 o z I ? Y 5 3' \" CR : ;h|M; \\\\o ;- e U > y s D 2 & q % 6 7 d@ C _ W \" U &I I 6o my / 5D @p yK= m pT \\\\ u 3 Hw X o \"\`I#t ;6 bD x c k AD e b < ~# \\\\ / 7XS v v \"~@w fp 6 B a p $ Q 7$BX1 ; I D t @ U k T 5 = Hmue bi ^ 1 B H x \"%`;

console.log("Input text length:", sampleText.length);
console.log("Sample text preview:", sampleText.substring(0, 200));

// Test basic pattern recognition
const patterns = [
  // Date patterns
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
  // Number patterns (potential amounts)
  /(\d{3,}(?:[,\s]\d{3})*(?:\.\d{2})?)/g,
  // Word sequences (potential descriptions)
  /([a-zA-Z]{3,}(?:\s+[a-zA-Z]{3,})*)/g,
];

console.log("\n=== PATTERN TESTING ===");
patterns.forEach((pattern, index) => {
  const matches = [...sampleText.matchAll(pattern)];
  console.log(`Pattern ${index + 1}: Found ${matches.length} matches`);
  if (matches.length > 0) {
    console.log("Sample matches:", matches.slice(0, 3).map(m => m[0]));
  }
});

// Test with a more realistic bank statement text sample
const realisticSample = `
ACCOUNT STATEMENT
Account No: XXXX8129
Date: 01/07/2025 to 07/07/2025
Balance: 25,450.75

01/07/2025  Salary Credit         50,000.00  CR  75,450.75
02/07/2025  UPI/Amazon.in         1,299.00   DR  74,151.75  
03/07/2025  ATM Withdrawal        5,000.00   DR  69,151.75
04/07/2025  NEFT Transfer         10,000.00  DR  59,151.75
05/07/2025  Grocery Store         2,450.50   DR  56,701.25
`;

console.log("\n=== TESTING WITH REALISTIC SAMPLE ===");
console.log("Realistic sample length:", realisticSample.length);

patterns.forEach((pattern, index) => {
  const matches = [...realisticSample.matchAll(pattern)];
  console.log(`Pattern ${index + 1} on realistic data: Found ${matches.length} matches`);
  if (matches.length > 0) {
    console.log("Sample matches:", matches.slice(0, 5).map(m => m[0]));
  }
});

console.log("\n=== RECOMMENDATIONS ===");
console.log("1. The actual PDF text is heavily garbled/encoded");
console.log("2. The Universal Parser should focus on pattern recognition");
console.log("3. May need to implement fallback manual entry for this specific PDF");
console.log("4. Consider testing with a different PDF sample");

console.log("\nDone!");
