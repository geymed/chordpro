import { ChordSheet } from '@/types';

/**
 * Uses Gemini Vision API (via server API route) to validate OCR results against the original image
 * Compares the extracted chord sheet with what's actually in the image
 */
export async function validateOCRWithImage(
  imageFile: File,
  extractedSheet: Partial<ChordSheet>
): Promise<Partial<ChordSheet>> {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('sheet', JSON.stringify(extractedSheet));

    const response = await fetch('/api/validate-ocr', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Validation API error:', errorData);
      return extractedSheet;
    }

    const validatedSheet = await response.json();
    return validatedSheet;
  } catch (error) {
    console.error('LLM validation failed:', error);
    return extractedSheet;
  }
}

