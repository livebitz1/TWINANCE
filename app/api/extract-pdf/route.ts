import { NextRequest, NextResponse } from 'next/server';

// Simple fallback PDF text extraction for server-side when pdf-parse fails
async function simplePdfExtraction(buffer: Buffer): Promise<string | null> {
  try {
    // Convert buffer to string and extract text patterns
    const text = buffer.toString('latin1');
    
    // Common PDF text extraction patterns
    const patterns = [
      /BT[\s\S]*?ET/g, // Text objects
      /\(([^)]+)\)/g,  // Text in parentheses
      /\[([^\]]+)\]/g, // Text in brackets
    ];
    
    let extractedText = '';
    
    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      for (const match of matches) {
        const cleanText = match
          .replace(/BT\s+|ET/g, '') // Remove text object markers
          .replace(/[()[\]]/g, '') // Remove brackets/parentheses
          .replace(/[^\x20-\x7E]/g, ' ') // Keep only printable ASCII
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        if (cleanText.length > 2 && /[a-zA-Z0-9]/.test(cleanText)) {
          extractedText += cleanText + ' ';
        }
      }
    }
    
    return extractedText.trim().length > 50 ? extractedText.trim() : null;
  } catch {
    return null;
  }
}

async function tryPdfParseExtraction(buffer: Buffer): Promise<{ text: string; numpages: number; info: Record<string, unknown> } | null> {
  try {
    // Only attempt pdf-parse if we can import it without errors
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    
    if (data.text && data.text.trim().length > 0) {
      return {
        text: data.text,
        numpages: data.numpages,
        info: data.info
      };
    }
    
    return null;
  } catch (error: unknown) {
    // Log the error but don't fail - use fallback instead
    console.log('pdf-parse failed (expected in some environments):', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(`Server-side PDF extraction attempt: ${file.name} (${buffer.length} bytes)`);

    // Try pdf-parse first (best quality)
    const pdfParseResult = await tryPdfParseExtraction(buffer);
    if (pdfParseResult) {
      console.log(`✅ pdf-parse extraction successful: ${pdfParseResult.text.length} characters`);
      return NextResponse.json({
        text: pdfParseResult.text,
        pages: pdfParseResult.numpages,
        info: pdfParseResult.info,
        method: 'pdf-parse'
      });
    }

    // Fallback to simple extraction
    console.log('Attempting simple server-side extraction...');
    const simpleResult = await simplePdfExtraction(buffer);
    if (simpleResult) {
      console.log(`✅ Simple extraction successful: ${simpleResult.length} characters`);
      return NextResponse.json({
        text: simpleResult,
        pages: 1,
        info: {},
        method: 'simple-server'
      });
    }

    // If server-side extraction completely failed, let client handle it
    console.log('Server-side extraction failed, deferring to client-side methods');
    return NextResponse.json(
      { 
        error: 'Server extraction failed',
        message: 'Using client-side fallback methods',
        canRetry: true
      }, 
      { status: 422 }
    );

  } catch (error) {
    console.error('Server PDF extraction error:', error);
    return NextResponse.json(
      { 
        error: 'Server error',
        message: 'Using client-side fallback methods',
        canRetry: true
      }, 
      { status: 500 }
    );
  }
}
