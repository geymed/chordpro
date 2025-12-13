/**
 * Lightweight client-side validation that runs in the browser
 * Complements server-side Gemini API validation
 * 
 * These checks run BEFORE sending to server, providing instant feedback
 */

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Quick validation of image file before processing
 */
export function validateImageFile(imageFile: File): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check file size (10MB limit)
  if (imageFile.size > 10 * 1024 * 1024) {
    issues.push('Image too large (max 10MB)');
  }

  // Check format
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(imageFile.type)) {
    issues.push(`Unsupported format: ${imageFile.type}. Use JPEG, PNG, or WebP`);
  }

  // Warning for very small images
  if (imageFile.size < 10 * 1024) {
    warnings.push('Image is very small - OCR quality may be poor');
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Quick validation of OCR text quality
 */
export function validateOCRText(ocrText: string): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check if OCR extracted meaningful text
  if (ocrText.trim().length < 20) {
    issues.push('OCR extracted very little text - image may be unclear');
  }

  // Check for common chord patterns
  const chordPattern = /[A-G][#b]?[m]?(\d+)?/g;
  const foundChords = ocrText.match(chordPattern);
  
  if (!foundChords || foundChords.length < 2) {
    warnings.push('Few chords detected - may need manual correction');
  }

  // Check for section markers
  const sectionPattern = /(verse|chorus|bridge|intro|outro)/gi;
  const foundSections = ocrText.match(sectionPattern);
  
  if (!foundSections || foundSections.length === 0) {
    warnings.push('No section markers detected (Verse, Chorus, etc.)');
  }

  // Check for lyrics (non-chord text)
  const lines = ocrText.split('\n').filter(l => l.trim().length > 0);
  const lyricLines = lines.filter(line => {
    // A line is likely lyrics if it has more words than chords
    const words = line.trim().split(/\s+/);
    const chordCount = words.filter(w => chordPattern.test(w)).length;
    return words.length > chordCount * 2;
  });

  if (lyricLines.length < 2) {
    warnings.push('Few lyric lines detected - may be mostly chords');
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Validate extracted chord sheet structure
 */
export function validateChordSheetStructure(sheet: {
  title?: string;
  artist?: string;
  sections?: Array<{ label: string; lines: Array<{ words: Array<{ word: string; chord?: string }> }> }>;
}): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check title
  if (!sheet.title || sheet.title.trim().length === 0) {
    issues.push('Missing song title');
  }

  // Check sections
  if (!sheet.sections || sheet.sections.length === 0) {
    issues.push('No sections found in chord sheet');
  } else {
    // Check each section has content
    sheet.sections.forEach((section, idx) => {
      if (!section.lines || section.lines.length === 0) {
        warnings.push(`Section "${section.label || idx + 1}" has no lines`);
      } else {
        // Check lines have words
        section.lines.forEach((line, lineIdx) => {
          if (!line.words || line.words.length === 0) {
            warnings.push(`Section "${section.label}" line ${lineIdx + 1} has no words`);
          }
        });
      }
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Combined validation - runs all checks
 */
export function validateAll(
  imageFile: File | null,
  ocrText: string,
  extractedSheet: {
    title?: string;
    artist?: string;
    sections?: Array<{ label: string; lines: Array<{ words: Array<{ word: string; chord?: string }> }> }>;
  }
): ValidationResult {
  const allIssues: string[] = [];
  const allWarnings: string[] = [];

  // Validate image
  if (imageFile) {
    const imageResult = validateImageFile(imageFile);
    allIssues.push(...imageResult.issues);
    allWarnings.push(...imageResult.warnings);
  }

  // Validate OCR text
  const ocrResult = validateOCRText(ocrText);
  allIssues.push(...ocrResult.issues);
  allWarnings.push(...ocrResult.warnings);

  // Validate structure
  const structureResult = validateChordSheetStructure(extractedSheet);
  allIssues.push(...structureResult.issues);
  allWarnings.push(...structureResult.warnings);

  return {
    isValid: allIssues.length === 0,
    issues: allIssues,
    warnings: allWarnings
  };
}



