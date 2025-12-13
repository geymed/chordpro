import { parseChord, chordToString } from './chord-utils';
import { ChordSheet, ChordSection } from '@/types';

/**
 * Validates and fixes a chord string using parseChord
 * Returns the cleaned chord string or null if invalid
 */
export function validateChord(chordStr: string | undefined): string | undefined {
  if (!chordStr || chordStr.trim() === '') {
    return undefined;
  }

  const trimmed = chordStr.trim();

  // Try to parse the chord
  const parsed = parseChord(trimmed);

  if (parsed) {
    // Convert back to string to normalize format
    return chordToString(parsed);
  }

  // If parsing failed, try common fixes
  const fixes: { pattern: RegExp; replacement: string }[] = [
    // Fix truncated "di" -> "dim"
    { pattern: /([A-G][#b]?)di$/i, replacement: '$1dim' },
    // Fix common OCR errors
    { pattern: /([A-G][#b]?)\s*diminished/gi, replacement: '$1dim' },
    { pattern: /([A-G][#b]?)\s*minor/gi, replacement: '$1m' },
    { pattern: /([A-G][#b]?)\s*major/gi, replacement: '$1' },
    // Remove extra spaces
    { pattern: /\s+/g, replacement: '' },
    // Fix common character substitutions
    { pattern: /[♯]/g, replacement: '#' },
    { pattern: /[♭]/g, replacement: 'b' },
  ];

  let cleaned = trimmed;
  for (const fix of fixes) {
    cleaned = cleaned.replace(fix.pattern, fix.replacement);
  }

  // Try parsing again after fixes
  const parsedAfterFix = parseChord(cleaned);
  if (parsedAfterFix) {
    return chordToString(parsedAfterFix);
  }

  // If still invalid, return undefined to remove it
  return undefined;
}

/**
 * Validates and cleans all chords in a chord sheet
 */
export function validateChordSheet(sheet: Partial<ChordSheet>): Partial<ChordSheet> {
  if (!sheet.sections) {
    return sheet;
  }

  const validatedSections: ChordSection[] = sheet.sections.map(section => ({
    ...section,
    lines: section.lines.map(line => ({
      words: line.words.map(word => ({
        word: word.word,
        chord: validateChord(word.chord)
      }))
    }))
  }));

  return {
    ...sheet,
    sections: validatedSections
  };
}

/**
 * Uses LLM to clean and verify chords from OCR results
 * This is optional - can be called after OCR processing
 */
export async function cleanChordsWithLLM(chordSheet: Partial<ChordSheet>): Promise<Partial<ChordSheet>> {
  // Check if Gemini API is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // If no API key, just use regular validation
    return validateChordSheet(chordSheet);
  }

  try {
    // Extract all chords from the sheet
    const chords: string[] = [];
    chordSheet.sections?.forEach(section => {
      section.lines.forEach(line => {
        line.words.forEach(word => {
          if (word.chord) {
            chords.push(word.chord);
          }
        });
      });
    });

    if (chords.length === 0) {
      return validateChordSheet(chordSheet);
    }

    // Create prompt for LLM to clean chords
    const prompt = `You are a music expert. Clean and normalize these chord names from OCR text. 
Return ONLY a JSON array of cleaned chord strings in the same order. 
If a chord is invalid or unclear, return the closest valid chord or null.

Chords to clean: ${JSON.stringify(chords)}

Rules:
- Use standard chord notation: C, Cm, C#m, Bb7, Am7, Dmaj7, etc.
- Fix OCR errors like "di" -> "dim", "rn" -> "m", etc.
- Remove invalid characters
- Return null for completely invalid entries
- Keep the same order

Return format: ["C", "Am", "F", null, "G7", ...]`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      // If LLM fails, fall back to regular validation
      return validateChordSheet(chordSheet);
    }

    const data = await response.json();
    const cleanedChordsText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Extract JSON from response (might have markdown code blocks)
    const jsonMatch = cleanedChordsText.match(/\[.*?\]/s);
    const cleanedChords: (string | null)[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Apply cleaned chords back to the sheet
    let chordIndex = 0;
    const validatedSections: ChordSection[] = chordSheet.sections!.map(section => ({
      ...section,
      lines: section.lines.map(line => ({
        words: line.words.map(word => {
          if (word.chord) {
            const cleaned = cleanedChords[chordIndex++];
            return {
              word: word.word,
              chord: cleaned && typeof cleaned === 'string' ? validateChord(cleaned) : undefined
            };
          }
          return word;
        })
      }))
    }));

    return {
      ...chordSheet,
      sections: validatedSections
    };
  } catch (error) {
    console.error('LLM chord cleaning failed, using regular validation:', error);
    // Fall back to regular validation
    return validateChordSheet(chordSheet);
  }
}



