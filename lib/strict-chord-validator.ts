import { parseChord, chordToString } from './chord-utils';
import { Chord, ChordSheet, ChordSection } from '@/types';

/**
 * STRICT chord validation - only accepts valid chords, rejects invalid ones
 * This is the production-ready validator that ensures data integrity
 */

/**
 * Valid extension numbers for chords
 * Common extensions: 5, 6, 7, 9, 11, 13
 */
const VALID_EXTENSIONS = [5, 6, 7, 9, 11, 13];

/**
 * Valid add numbers for add chords
 * Common: add2, add4, add6, add9
 */
const VALID_ADDS = [2, 4, 6, 9];

/**
 * Validates that a parsed chord structure is valid
 * Returns true if the chord is valid, false otherwise
 */
function isValidChordStructure(chord: Chord): boolean {
  // Special cases are always valid
  if (chord.special === 'N.C.' || chord.special === 'x') {
    return true;
  }

  // Validate extension
  if (chord.extension !== null) {
    if (!VALID_EXTENSIONS.includes(chord.extension)) {
      return false;
    }
  }

  // Validate add
  if (chord.add !== null) {
    if (!VALID_ADDS.includes(chord.add)) {
      return false;
    }
  }

  // Validate quality + extension combinations
  // Some combinations don't make sense
  if (chord.quality === 'sus2' || chord.quality === 'sus4') {
    // Suspended chords typically don't have extensions (though sus2/4 with 7 is sometimes used)
    // We'll allow it but could be stricter
  }

  // Validate inversion note
  if (chord.inversion !== null) {
    // Inversion must be a valid note
    const validNotes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    if (!validNotes.includes(chord.inversion)) {
      return false;
    }
  }

  return true;
}

/**
 * STRICT chord validator - only accepts valid chords
 * Returns the normalized chord string if valid, undefined if invalid
 * Does NOT attempt to fix invalid chords - rejects them instead
 */
export function validateChordStrict(chordStr: string | undefined): string | undefined {
  if (!chordStr || chordStr.trim() === '') {
    return undefined;
  }

  const trimmed = chordStr.trim();

  // Try to parse the chord
  const parsed = parseChord(trimmed);

  if (!parsed) {
    // If parsing failed, the chord is invalid - reject it
    return undefined;
  }

  // Validate the chord structure
  if (!isValidChordStructure(parsed)) {
    // Invalid structure - reject it
    return undefined;
  }

  // Convert back to string to normalize format
  // This ensures consistent representation
  return chordToString(parsed);
}

/**
 * Validates all chords in a chord sheet using strict validation
 * Invalid chords are removed (set to undefined)
 */
export function validateChordSheetStrict(sheet: Partial<ChordSheet>): Partial<ChordSheet> {
  if (!sheet.sections) {
    return sheet;
  }

  const validatedSections: ChordSection[] = sheet.sections.map(section => ({
    ...section,
    lines: section.lines.map(line => ({
      words: line.words.map(word => ({
        word: word.word,
        chord: validateChordStrict(word.chord)
      }))
    }))
  }));

  return {
    ...sheet,
    sections: validatedSections
  };
}

/**
 * Gets a list of validation errors for a chord string
 * Returns empty array if valid, array of error messages if invalid
 */
export function getChordValidationErrors(chordStr: string | undefined): string[] {
  const errors: string[] = [];

  if (!chordStr || chordStr.trim() === '') {
    return errors; // Empty is valid (no chord)
  }

  const trimmed = chordStr.trim();
  const parsed = parseChord(trimmed);

  if (!parsed) {
    errors.push(`Invalid chord format: "${trimmed}"`);
    return errors;
  }

  // Check extension validity
  if (parsed.extension !== null && !VALID_EXTENSIONS.includes(parsed.extension)) {
    errors.push(`Invalid extension: ${parsed.extension}. Valid extensions are: ${VALID_EXTENSIONS.join(', ')}`);
  }

  // Check add validity
  if (parsed.add !== null && !VALID_ADDS.includes(parsed.add)) {
    errors.push(`Invalid add: ${parsed.add}. Valid adds are: ${VALID_ADDS.join(', ')}`);
  }

  // Check inversion validity
  if (parsed.inversion !== null) {
    const validNotes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    if (!validNotes.includes(parsed.inversion)) {
      errors.push(`Invalid inversion note: ${parsed.inversion}`);
    }
  }

  return errors;
}

