// OCR extraction utility using Tesseract.js
import Tesseract from 'tesseract.js';

export async function extractTextWithOCR(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { data: { text } } = await Tesseract.recognize(reader.result as ArrayBuffer, 'eng', {
          logger: m => console.log(m)
        });
        resolve(text);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
