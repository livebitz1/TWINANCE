/**
 * Custom PDF text extractor without external dependencies
 * Handles PDF text extraction using multiple fallback methods
 */

export class CustomPDFExtractor {
  static async extractText(buffer: Buffer): Promise<string> {
    console.log("🔍 Starting COMPREHENSIVE PDF text extraction for ALL content...");
    console.log(`📄 Processing PDF with ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Convert buffer to string for pattern matching
    const pdfString = buffer.toString('latin1');
    console.log(`� PDF content: ${pdfString.length} total characters`);
    
    let allExtractedText = "";
    let extractionMethods = 0;
    
    console.log("🚀 Beginning comprehensive extraction with all methods...");
    
    // Method 1: Extract ALL text from stream objects (no limits)
    console.log("📥 Method 1: Stream extraction (complete scan)...");
    const streamText = this.extractFromStreams(pdfString);
    if (streamText.length > 0) {
      allExtractedText += streamText + "\n";
      extractionMethods++;
      console.log(`✅ Method 1 - Stream extraction: ${streamText.length} characters extracted`);
    }
    
    // Method 2: Extract ALL text from text objects (comprehensive)
    console.log("📥 Method 2: Text object extraction (BT...ET blocks)...");
    const objectText = this.extractFromTextObjects(pdfString);
    if (objectText.length > 0) {
      allExtractedText += objectText + "\n";
      extractionMethods++;
      console.log(`✅ Method 2 - Text object extraction: ${objectText.length} characters extracted`);
    }
    
    // Method 3: Extract ALL text from parentheses notation (complete scan)
    console.log("📥 Method 3: Parentheses extraction (complete scan)...");
    const parenText = this.extractFromParentheses(pdfString);
    if (parenText.length > 0) {
      allExtractedText += parenText + "\n";
      extractionMethods++;
      console.log(`✅ Method 3 - Parentheses extraction: ${parenText.length} characters extracted`);
    }
    
    // Method 4: Extract ALL readable patterns (thorough scan)
    console.log("📥 Method 4: Pattern extraction (thorough scan)...");
    const patternText = this.extractReadablePatterns(pdfString);
    if (patternText.length > 0) {
      allExtractedText += patternText + "\n";
      extractionMethods++;
      console.log(`✅ Method 4 - Pattern extraction: ${patternText.length} characters extracted`);
    }
    
    // Method 5: Extract ALL Unicode text (comprehensive)
    console.log("📥 Method 5: Unicode extraction (comprehensive scan)...");
    const unicodeText = this.extractUnicodeText(pdfString);
    if (unicodeText.length > 0) {
      allExtractedText += unicodeText + "\n";
      extractionMethods++;
      console.log(`✅ Method 5 - Unicode extraction: ${unicodeText.length} characters extracted`);
    }
    
    // Combine and deduplicate all extracted text
    console.log("🔄 Processing and cleaning extracted text...");
    const finalText = this.cleanAndDeduplicateText(allExtractedText);
    
    console.log(`🎯 EXTRACTION SUMMARY:`);
    console.log(`   📊 Methods used: ${extractionMethods}/5`);
    console.log(`   📝 Raw extracted: ${allExtractedText.length} characters`);
    console.log(`   ✨ Final cleaned: ${finalText.length} characters`);
    console.log(`   📋 Content sample: "${finalText.substring(0, 300)}..."`);
    
    if (finalText.length === 0) {
      console.error("🚨 CRITICAL: No readable text extracted from PDF");
      throw new Error("No readable text could be extracted from PDF - file may be image-based, corrupted, or password-protected");
    }
    
    if (finalText.length < 100) {
      console.warn("⚠️ WARNING: Very little text extracted - PDF may have issues");
    }
    
    console.log(`✅ COMPLETE extraction finished successfully: ${finalText.length} total characters`);
    return finalText;
  }
  
  private static extractFromStreams(pdfString: string): string {
    const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;
    const streams = [];
    let match;
    
    while ((match = streamPattern.exec(pdfString)) !== null) {
      const streamContent = match[1];
      // Look for readable text patterns in streams
      const textMatches = streamContent.match(/\([^)]*\)|[A-Za-z0-9\s.,₹$-]+/g);
      if (textMatches) {
        streams.push(...textMatches);
      }
    }
    
    return streams
      .map(text => text.replace(/[()]/g, ''))
      .filter(text => text.length > 2 && /[A-Za-z0-9]/.test(text))
      .join(' ');
  }
  
  private static extractFromTextObjects(pdfString: string): string {
    // Extract text from BT...ET blocks (PDF text objects)
    const textObjectPattern = /BT\s*([\s\S]*?)\s*ET/g;
    const textObjects = [];
    let match;
    
    while ((match = textObjectPattern.exec(pdfString)) !== null) {
      const textContent = match[1];
      
      // Extract text from Tj commands
      const tjMatches = textContent.match(/\([^)]*\)\s*Tj/g);
      if (tjMatches) {
        textObjects.push(...tjMatches.map(tj => tj.replace(/\([^)]*\)\s*Tj/, '').replace(/[()]/g, '')));
      }
      
      // Extract text from TJ commands (array notation)
      const tjArrayMatches = textContent.match(/\[[^\]]*\]\s*TJ/g);
      if (tjArrayMatches) {
        tjArrayMatches.forEach(tjArray => {
          const stringMatches = tjArray.match(/\([^)]*\)/g);
          if (stringMatches) {
            textObjects.push(...stringMatches.map(str => str.replace(/[()]/g, '')));
          }
        });
      }
    }
    
    return textObjects
      .filter(text => text.length > 1 && /[A-Za-z0-9]/.test(text))
      .join(' ');
  }
  
  private static extractFromParentheses(pdfString: string): string {
    // Extract all text within parentheses (common PDF text format)
    const parenMatches = pdfString.match(/\([^)]+\)/g) || [];
    
    return parenMatches
      .map(match => match.replace(/[()]/g, ''))
      .filter(text => text.length > 2 && /[A-Za-z0-9]/.test(text))
      .join(' ');
  }
  
  private static extractReadablePatterns(pdfString: string): string {
    // Extract readable text patterns
    const readableMatches = pdfString.match(/[A-Za-z0-9][A-Za-z0-9\s.,₹$-]{3,}/g) || [];
    
    return readableMatches
      .filter(text => {
        // Filter out PDF commands and binary data
        return !text.includes('/') && 
               !text.includes('<') && 
               !text.includes('>') &&
               !text.match(/^[0-9\s.]+$/) && // Skip pure numbers
               text.length > 3;
      })
      .join(' ');
  }
  
  private static extractUnicodeText(pdfString: string): string {
    // Extract Unicode text sequences
    const unicodeMatches = [];
    
    // Look for Unicode escape sequences (\uXXXX)
    const unicodePattern = /\\u[0-9a-fA-F]{4}/g;
    let match;
    while ((match = unicodePattern.exec(pdfString)) !== null) {
      try {
        const unicodeChar = String.fromCharCode(parseInt(match[0].substring(2), 16));
        if (/[A-Za-z0-9\s.,₹$-]/.test(unicodeChar)) {
          unicodeMatches.push(unicodeChar);
        }
      } catch (e) {
        // Skip invalid Unicode sequences
      }
    }
    
    // Look for UTF-8 encoded text patterns
    const utf8Pattern = /[\u0020-\u007E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]+/g;
    const utf8Matches = pdfString.match(utf8Pattern) || [];
    
    const allUnicode = [...unicodeMatches, ...utf8Matches]
      .filter(text => text.length > 2 && /[A-Za-z0-9]/.test(text))
      .join(' ');
    
    return this.cleanExtractedText(allUnicode);
  }
  
  private static cleanAndDeduplicateText(allText: string): string {
    // First clean the text
    const cleaned = this.cleanExtractedText(allText);
    
    // Split into lines and deduplicate
    const lines = cleaned.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Remove exact duplicates while preserving order
    const uniqueLines = [];
    const seen = new Set();
    
    for (const line of lines) {
      if (!seen.has(line)) {
        seen.add(line);
        uniqueLines.push(line);
      }
    }
    
    // Join back and do final cleanup
    let result = uniqueLines.join('\n');
    
    // Remove any remaining PDF artifacts
    result = result
      .replace(/\b(obj|endobj|stream|endstream|xref|trailer|startxref)\b/gi, '')
      .replace(/\b\d+\s+\d+\s+R\b/g, '') // Remove object references
      .replace(/<<[^>]*>>/g, '') // Remove dictionary objects
      .replace(/\[[^\]]*\]/g, '') // Remove array objects
      .replace(/\s+/g, ' ')
      .trim();
    
    return result;
  }
  
  private static cleanExtractedText(text: string): string {
    // Remove PDF artifacts and clean up text
    let cleaned = text
      .replace(/\0/g, '') // Remove null characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Remove common PDF keywords that might have slipped through
    const pdfKeywords = ['obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref'];
    pdfKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });
    
    return cleaned.trim();
  }
}
