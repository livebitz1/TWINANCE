import { NextRequest, NextResponse } from 'next/server';
import { CustomPDFExtractor } from '@/utils/customPDFExtractor';

export async function POST(req: NextRequest) {
  try {
    console.log("📄 Starting COMPREHENSIVE PDF parsing API request...");
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`📦 Processing PDF: ${file.name} (${fileSizeMB} MB)`);
    console.log("⏱️ COMPREHENSIVE extraction mode - may take time for large files");
    
    // Convert file to buffer
    console.log("🔄 Converting file to buffer for processing...");
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`✅ Buffer created: ${buffer.length} bytes`);
    
    // Method 1: Custom PDF Extractor (PRIMARY - most comprehensive)
    try {
      console.log("🚀 Attempting COMPREHENSIVE custom PDF extraction...");
      console.log("   📊 Using all 5 extraction methods");
      console.log("   🔍 Extracting ALL possible text content");
      
      const startTime = Date.now();
      const customText = await CustomPDFExtractor.extractText(buffer);
      const extractionTime = Date.now() - startTime;
      
      if (customText && customText.trim().length > 20) {
        console.log(`✅ COMPREHENSIVE extraction successful!`);
        console.log(`   ⏱️ Processing time: ${extractionTime}ms`);
        console.log(`   📊 Extracted: ${customText.length} characters`);
        console.log(`   📋 Quality: ${Math.round((customText.match(/[a-zA-Z0-9]/g)?.length || 0) / customText.length * 100)}% readable`);
        console.log(`   📝 Sample: "${customText.substring(0, 150)}..."`);
        
        return NextResponse.json({
          success: true,
          text: customText,
          pages: 1,
          info: { 
            method: 'comprehensive-custom',
            extractionTime: extractionTime,
            fileSizeMB: fileSizeMB,
            charactersExtracted: customText.length,
            readabilityPercent: Math.round((customText.match(/[a-zA-Z0-9]/g)?.length || 0) / customText.length * 100)
          },
          method: 'comprehensive-custom-extractor',
          extractedLength: customText.length,
          processingTime: extractionTime
        });
      } else {
        console.warn("⚠️ Custom extraction returned insufficient text");
      }
    } catch (customError) {
      console.error("❌ Custom extraction failed:", customError);
    }
    
    // Try Method 2: pdf-parse library (with safer import)
    try {
      // Try using pdf-parse with safer import handling
      let pdfParse;
      try {
        // Try dynamic import in a controlled way
        const pdfParseModule = await import('pdf-parse');
        pdfParse = pdfParseModule.default || pdfParseModule;
      } catch (importError) {
        console.log("pdf-parse import failed:", importError);
        throw new Error("pdf-parse module not available");
      }
      
      if (!pdfParse) {
        throw new Error("pdf-parse module not available");
      }
      
      const options = {
        max: 0, // Don't limit pages
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      
      const data = await pdfParse(buffer, options);
      
      if (!data.text || data.text.trim().length === 0) {
        console.warn("⚠️ PDF-parse returned empty text");
        return NextResponse.json({ 
          error: 'No text could be extracted from PDF',
          canRetry: true 
        }, { status: 422 });
      }
      
      // Clean and validate the extracted text
      let cleanText = data.text;
      
      // Remove common PDF artifacts and binary markers
      const binaryMarkers = ['%PDF', '/Type', '/Info', 'endobj', 'stream', '/Length', '/Filter'];
      const hasBinaryData = binaryMarkers.some(marker => cleanText.includes(marker));
      
      if (hasBinaryData) {
        console.warn("🚨 Binary markers detected in extracted text, attempting to clean...");
        // Try to extract readable portions only
        const lines = cleanText.split('\n');
        const cleanLines = lines.filter((line: string) => {
          return !binaryMarkers.some(marker => line.includes(marker)) && 
                 line.trim().length > 0 &&
                 /[a-zA-Z0-9]/.test(line);
        });
        cleanText = cleanLines.join('\n');
        
        if (cleanText.trim().length === 0) {
          throw new Error('All extracted text contains binary data');
        }
        console.log(`✅ Cleaned text: ${cleanText.length} characters (removed binary artifacts)`);
      }
      
      console.log(`✅ PDF extraction successful: ${cleanText.length} characters from ${data.numpages} pages`);
      console.log("📋 First 200 characters:", cleanText.substring(0, 200));
      
      return NextResponse.json({
        success: true,
        text: cleanText,
        pages: data.numpages,
        info: data.info,
        method: 'pdf-parse',
        extractedLength: data.text.length
      });

    } catch (pdfError) {
      console.error('PDF-parse also failed:', pdfError);
      
      // Method 3: Enhanced fallback text extraction
      try {
        console.log("Attempting fallback extraction methods...");
        const text = buffer.toString('utf8');
        
        // Method 1: Extract text between parentheses (common PDF format)
        const textMatches = text.match(/\(([^)]+)\)/g) || [];
        let extractedText = textMatches
          .map(match => match.replace(/[()]/g, ''))
          .filter(text => text.length > 2 && /[a-zA-Z0-9]/.test(text))
          .join(' ');
        
        // Method 2: Extract words from /BT ... ET blocks (PDF text objects)
        if (extractedText.length < 50) {
          const btMatches = text.match(/BT\s+.*?ET/g) || [];
          const btText = btMatches
            .map(block => {
              // Extract text from PDF text commands
              const textCommands = block.match(/\([^)]+\)\s*Tj/g) || [];
              return textCommands.map(cmd => cmd.replace(/[\(\)]/g, '').replace(/\s*Tj/g, '')).join(' ');
            })
            .filter(text => text.length > 2)
            .join(' ');
          
          if (btText.length > extractedText.length) {
            extractedText = btText;
            console.log("Using BT/ET block extraction");
          }
        }
        
        // Method 3: Look for readable text patterns
        if (extractedText.length < 50) {
          const readableWords = text.match(/[A-Za-z0-9][A-Za-z0-9\s.,₹$-]{3,}/g) || [];
          const readableText = readableWords
            .filter(word => !word.includes('/') && !word.includes('<') && !word.includes('>'))
            .join(' ');
          
          if (readableText.length > extractedText.length) {
            extractedText = readableText;
            console.log("Using readable pattern extraction");
          }
        }
        
        if (extractedText.length > 50) {
          console.log(`✅ Fallback extraction successful: ${extractedText.length} characters`);
          return NextResponse.json({
            success: true,
            text: extractedText,
            pages: 1,
            info: {},
            method: 'fallback',
            extractedLength: extractedText.length
          });
        }
        
        throw new Error('No readable text found in PDF');
        
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
        throw new Error('Unable to extract text from PDF using any method');
      }
    }

  } catch (error) {
    console.error('❌ PDF parsing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
        canRetry: false
      }, 
      { status: 500 }
    );
  }
}
