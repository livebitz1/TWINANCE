import { NextRequest, NextResponse } from 'next/server';
import { CustomPDFExtractor } from '@/utils/customPDFExtractor';

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
    // Try server-side extraction (pdf-parse or custom)
    let extractedText = '';
    let method = '';
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      extractedText = data.text;
      method = 'pdf-parse';
    } catch (e) {
      // Fallback to custom extractor
      extractedText = await CustomPDFExtractor.extractText(buffer);
      method = 'custom';
    }
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'No text extracted from PDF' }, { status: 422 });
    }
    return NextResponse.json({ success: true, text: extractedText, method });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
