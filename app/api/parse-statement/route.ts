import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side PDF text extraction API
 * Only uses pdf-parse library for reliable extraction
 * Falls back to client-side methods if this fails
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`[Server] Attempting PDF extraction for: ${file.name} (${(buffer.length / 1024).toFixed(2)} KB)`);

    // Only use pdf-parse for server-side extraction
    // Do NOT use custom extractors that read buffer as Latin-1 - they produce garbled text
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);

      if (!data.text || data.text.trim().length === 0) {
        console.log('[Server] pdf-parse returned empty text');
        return NextResponse.json({
          success: false,
          error: 'No text extracted from PDF',
          canRetry: true,
          message: 'Server extraction returned empty text. Client will use PDF.js fallback.'
        }, { status: 422 });
      }

      // Validate that extracted text is readable (not binary/garbled)
      const readableCharRegex = /[a-zA-Z0-9\s.,₹$]/g;
      const readableChars = data.text.match(readableCharRegex);
      const readabilityRatio = readableChars ? readableChars.length / data.text.length : 0;

      if (readabilityRatio < 0.3) {
        console.log(`[Server] Low readability (${Math.round(readabilityRatio * 100)}%) - text may be garbled`);
        console.log(`[Server] Text preview: ${data.text.substring(0, 200)}`);
        return NextResponse.json({
          success: false,
          error: 'Extracted text appears corrupted or garbled',
          canRetry: true,
          message: 'Server extraction produced low-quality text. Client will use PDF.js fallback.'
        }, { status: 422 });
      }

      console.log(`[Server] ✅ Successfully extracted ${data.text.length} characters (${Math.round(readabilityRatio * 100)}% readable)`);

      return NextResponse.json({
        success: true,
        text: data.text,
        pages: data.numpages,
        method: 'pdf-parse'
      });

    } catch (pdfParseError) {
      console.log('[Server] pdf-parse failed:', pdfParseError instanceof Error ? pdfParseError.message : 'Unknown error');

      // Don't use broken fallback methods - let client handle it
      return NextResponse.json({
        success: false,
        error: 'Server-side extraction failed',
        canRetry: true,
        message: 'pdf-parse failed. Client will use PDF.js for extraction.'
      }, { status: 422 });
    }

  } catch (error) {
    console.error('[Server] PDF extraction error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      canRetry: true,
      message: 'Server error. Client will use PDF.js for extraction.'
    }, { status: 500 });
  }
}
