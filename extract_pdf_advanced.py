#!/usr/bin/env python3

import sys
import os

def extract_pdf_content():
    """Try multiple methods to extract PDF content"""
    
    pdf_file = "Acct Statement_XX8129_07072025.pdf"
    
    if not os.path.exists(pdf_file):
        print(f"PDF file not found: {pdf_file}")
        return
    
    print("=== PDF CONTENT EXTRACTION ===")
    print(f"File: {pdf_file}")
    print(f"Size: {os.path.getsize(pdf_file)} bytes")
    
    # Method 1: Try using PyMuPDF (fitz) if available
    try:
        import fitz  # PyMuPDF
        print("\n--- Using PyMuPDF ---")
        doc = fitz.open(pdf_file)
        full_text = ""
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            full_text += text + "\n"
        
        print(f"Extracted {len(full_text)} characters")
        if full_text.strip():
            print("\n=== EXTRACTED TEXT ===")
            print(full_text[:2000])  # First 2000 characters
            
            # Look for financial patterns
            import re
            amounts = re.findall(r'₹[\d,]+\.?\d*', full_text)
            dates = re.findall(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', full_text)
            
            print(f"\n--- Found {len(amounts)} amounts ---")
            print(amounts[:10])
            print(f"\n--- Found {len(dates)} dates ---")
            print(dates[:10])
            
        doc.close()
        return
        
    except ImportError:
        print("PyMuPDF not available")
    except Exception as e:
        print(f"PyMuPDF failed: {e}")
    
    # Method 2: Try basic text patterns from raw content
    try:
        print("\n--- Using raw byte analysis ---")
        with open(pdf_file, 'rb') as f:
            content = f.read()
        
        # Convert to string and look for text patterns
        text_content = content.decode('latin1', errors='ignore')
        
        # Look for common patterns
        import re
        
        # Find potential amounts
        amounts = re.findall(r'\d{2,6}\.?\d{0,2}', text_content)
        large_amounts = [a for a in amounts if len(a) >= 4 and '.' in a]
        
        print(f"Found {len(large_amounts)} potential amounts:")
        print(large_amounts[:20])
        
        # Look for text that might be descriptions
        words = re.findall(r'[A-Z][a-z]{3,}', text_content)
        print(f"\nFound {len(words)} potential words:")
        print(words[:20])
        
    except Exception as e:
        print(f"Raw analysis failed: {e}")

if __name__ == "__main__":
    extract_pdf_content()
