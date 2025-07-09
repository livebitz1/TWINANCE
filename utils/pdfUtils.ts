"use client";

// Client-side PDF extraction utilities
// Only uses browser-compatible libraries

let pdfjsLib: any = null;

export async function extractTextFromPDF(file: File): Promise<string | null> {
  console.log(`Starting PDF extraction for file: ${file.name}`);
  
  // Try method 1: Server-side API (most reliable)
  try {
    console.log("Attempting server-side API method...");
    const result = await extractWithServerAPI(file);
    if (result && result.trim().length > 0) {
      console.log(`✅ Server-side API successful: ${result.length} characters`);
      return result;
    }
  } catch (error) {
    console.log("Server-side API method failed:", error);
  }

  // Try method 2: Enhanced PDF.js (browser-compatible)
  try {
    console.log("Attempting pdfjs-dist method...");
    const result = await extractWithPdfJs(file);
    if (result && result.trim().length > 0) {
      console.log(`✅ pdfjs-dist successful: ${result.length} characters`);
      return result;
    }
  } catch (error) {
    console.log("pdfjs-dist method failed:", error);
  }

  // Try method 3: OCR fallback for image-based PDFs (client-side only)
  if (typeof window !== 'undefined') {
    try {
      console.log("Attempting OCR fallback method...");
      const { extractTextWithOCR } = await import('./ocrUtils');
      const result = await extractTextWithOCR(file);
      if (result && result.trim().length > 0) {
        console.log(`✅ OCR fallback successful: ${result.length} characters`);
        return result;
      }
    } catch (error) {
      console.log("OCR fallback method failed:", error);
    }
  }

  // Try method 4: Throw error - no fallback data generation
  console.log("All PDF text extraction methods failed");
  throw new Error('All PDF extraction methods failed - cannot extract text from this PDF file. Please ensure the PDF contains readable text and is not password-protected or corrupted.');
}

async function extractWithServerAPI(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/parse-statement', {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    const data = await response.json();
    if (data.success && data.text && data.text.trim().length > 0) {
      console.log(`Server API success (${data.method || 'pdf-parse'}): ${data.text.length} characters`);
      return data.text;
    }
  } else if (response.status === 422 || response.status === 500) {
    // Recoverable error - server failed but client can use fallbacks
    const errorData = await response.json();
    console.log(`Server API failed (${response.status}): ${errorData.message || errorData.error}`);
    if (errorData.canRetry) {
      throw new Error(`Server extraction failed: ${errorData.message}`);
    }
  }

  throw new Error(`Server API failed: ${response.status}`);
}

async function extractWithPdfJs(file: File): Promise<string | null> {
  // Dynamic import of PDF.js with better error handling
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
      
      // Configure worker with the correct path and fallback
      if (typeof window !== 'undefined') {
        try {
          // Use the specific worker path for the matched version
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          console.log("PDF.js worker configured successfully");
        } catch (workerError) {
          console.log("Worker configuration failed, trying legacy path:", workerError);
          try {
            const pdfWorker = await import('pdfjs-dist/legacy/build/pdf.worker.entry');
            pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;
          } catch (legacyError) {
            console.log("Legacy worker also failed, using fallback");
            pdfjsLib.GlobalWorkerOptions.workerSrc = null;
          }
        }
      }
    } catch (importError) {
      console.error("Failed to import pdfjs-dist:", importError);
      throw new Error("PDF.js import failed");
    }
  }

  // Convert File to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF document with error handling
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    standardFontDataUrl: '/standard_fonts/',
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    verbosity: 0, // Reduce console spam
    disableAutoFetch: true,
    disableStream: true
  });

  const pdf = await loadingTask.promise;
  let extractedText = '';
  
  console.log(`PDF has ${pdf.numPages} pages`);
  
  // Extract text from each page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Extract text items and join them with proper spacing
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .filter((text: string) => text.trim().length > 0)
        .join(' ');
      
      extractedText += pageText + '\n';
      console.log(`Extracted text from page ${pageNum}: ${pageText.length} characters`);
      
      // Log first 200 characters of each page for debugging
      if (pageText.length > 0) {
        console.log(`Page ${pageNum} sample:`, pageText.substring(0, 200));
      }
    } catch (pageError) {
      console.error(`Error extracting text from page ${pageNum}:`, pageError);
      // Continue with other pages
    }
  }
  
  console.log(`Total extracted text length: ${extractedText.length} characters`);
  
  if (extractedText.trim().length === 0) {
    throw new Error('No text could be extracted from the PDF');
  }
  
  return extractedText.trim();
}

// Removed the flawed extractWithFileReader function that was reading binary data
// This was causing Gemini to receive PDF binary streams instead of readable text
