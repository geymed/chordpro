import { Chord, Note, Accidental, ChordQuality } from '@/types';

/**
 * Parses a chord string into a structured Chord object
 * Examples:
 * - "C" -> { note: 'C', accidental: null, quality: 'major', ... }
 * - "Cm" -> { note: 'C', accidental: null, quality: 'minor', ... }
 * - "C#dim" -> { note: 'C', accidental: '#', quality: 'dim', ... }
 * - "Bb7" -> { note: 'B', accidental: 'b', quality: 'major', extension: 7, ... }
 * - "Am7" -> { note: 'A', accidental: null, quality: 'minor', extension: 7, ... }
 * - "C/E" -> { note: 'C', ..., inversion: 'E', ... }
 * - "N.C." -> { note: 'A', ..., special: 'N.C.', ... }
 */
export function parseChord(chordStr: string): Chord | null {
  if (!chordStr || chordStr.trim() === '') {
    return null;
  }

  let trimmed = chordStr.trim();

  // Handle special cases
  if (/^N\.?C\.?$/i.test(trimmed)) {
    return {
      note: 'A', // Dummy note
      accidental: null,
      quality: null,
      extension: null,
      add: null,
      inversion: null,
      special: 'N.C.',
      explicitMaj: false,
    };
  }

  if (/^[xX]$/.test(trimmed)) {
    return {
      note: 'A', // Dummy note
      accidental: null,
      quality: null,
      extension: null,
      add: null,
      inversion: null,
      special: 'x',
      explicitMaj: false,
    };
  }

  // Fix common truncations BEFORE parsing
  // Handle "di" -> "dim" (truncated diminished)
  trimmed = trimmed.replace(/([A-G][#b]?)di$/i, '$1dim');
  
  // Extract root note
  const rootMatch = trimmed.match(/^([A-G])/i);
  if (!rootMatch) {
    return null;
  }

  const note = rootMatch[1].toUpperCase() as Note;

  // Extract accidental (# or b)
  let accidental: Accidental = null;
  let remaining = trimmed.substring(1);
  if (remaining.startsWith('#') || remaining.startsWith('♯')) {
    accidental = '#';
    remaining = remaining.substring(1);
  } else if (remaining.startsWith('b') || remaining.startsWith('♭')) {
    // 'b' could be accidental OR part of 'maj', 'dim', 'aug'
    // If followed by 'maj', it's part of 'maj' (not accidental)
    // If followed by 'dim' or 'aug', it's part of those (not accidental)
    // Otherwise, it's an accidental
    if (remaining.match(/^bmaj/i)) {
      // 'b' is part of 'maj', not an accidental
      // This shouldn't happen normally, but handle it
    } else if (remaining.match(/^b[dimau]/i)) {
      // 'b' is part of 'dim' or 'aug', not an accidental
    } else {
      // 'b' is an accidental
      accidental = 'b';
      remaining = remaining.substring(1);
    }
  }

  // Extract quality (m, maj, dim, aug, sus)
  let quality: ChordQuality = null;
  let extension: number | null = null;
  let add: number | null = null;

  // Check for diminished FIRST (before minor, since 'dim' contains 'm')
  if (remaining.match(/^dim/i)) {
    quality = 'dim';
    remaining = remaining.replace(/^dim/i, '');
  }
  // Check for major (maj) BEFORE minor, since 'maj' contains 'm'
  else if (remaining.match(/^maj/i)) {
    quality = 'major';
    const extMatch = remaining.match(/^maj(\d+)/i);
    if (extMatch) {
      extension = parseInt(extMatch[1], 10);
    }
    remaining = remaining.replace(/^maj(\d+)?/i, '');
    
    // Extract add (add2, add4, add9) - need to do this before returning
    let add: number | null = null;
    const addMatch = remaining.match(/^add(\d+)/i);
    if (addMatch) {
      add = parseInt(addMatch[1], 10);
      remaining = remaining.substring(addMatch[0].length);
    }
    
    // Extract inversion (e.g., /E)
    let inversion: Note | null = null;
    const invMatch = remaining.match(/\/([A-G][#b]?)/i);
    if (invMatch) {
      const invNote = invMatch[1].toUpperCase();
      const invNoteMatch = invNote.match(/^([A-G])/);
      if (invNoteMatch) {
        inversion = invNoteMatch[1] as Note;
      }
    }
    
    // Mark that "maj" was explicitly present
    return {
      note,
      accidental,
      quality,
      extension,
      add,
      inversion,
      special: null,
      explicitMaj: true,
    };
  }
  // Check for minor
  else if (remaining.match(/^m(?:aj|in|7|9|11|13)?/i)) {
    quality = 'minor';
    const extMatch = remaining.match(/^m(?:aj|in)?(\d+)/i);
    if (extMatch) {
      extension = parseInt(extMatch[1], 10);
    }
    remaining = remaining.replace(/^m(?:aj|in)?(\d+)?/i, '');
  }
  // Check for augmented
  else if (remaining.match(/^aug/i)) {
    quality = 'aug';
    remaining = remaining.replace(/^aug/i, '');
  }
  // Check for suspended
  else if (remaining.match(/^sus/i)) {
    const susMatch = remaining.match(/^sus(2|4)?/i);
    if (susMatch && susMatch[1]) {
      quality = susMatch[1] === '2' ? 'sus2' : 'sus4';
    } else {
      quality = 'sus4'; // Default to sus4
    }
    remaining = remaining.replace(/^sus(2|4)?/i, '');
  }
  // Default to major if no quality specified
  else {
    quality = 'major';
  }

  // Extract extension numbers (7, 9, 11, 13) - but not if already extracted
  if (!extension) {
    const extMatch = remaining.match(/^(\d+)/);
    if (extMatch) {
      extension = parseInt(extMatch[1], 10);
      remaining = remaining.substring(extMatch[0].length);
    }
  }

  // Extract add (add2, add4, add9)
  const addMatch = remaining.match(/^add(\d+)/i);
  if (addMatch) {
    add = parseInt(addMatch[1], 10);
    remaining = remaining.substring(addMatch[0].length);
  }

  // Extract inversion (e.g., /E)
  let inversion: Note | null = null;
  const invMatch = remaining.match(/\/([A-G][#b]?)/i);
  if (invMatch) {
    const invNote = invMatch[1].toUpperCase();
    // Extract just the note letter (ignore accidental in inversion for now)
    const invNoteMatch = invNote.match(/^([A-G])/);
    if (invNoteMatch) {
      inversion = invNoteMatch[1] as Note;
    }
  }

  return {
    note,
    accidental,
    quality,
    extension,
    add,
    inversion,
    special: null,
    explicitMaj: false, // "maj" was not explicitly present
  };
}

/**
 * Converts a Chord object back to a string representation
 */
export function chordToString(chord: Chord | null): string {
  if (!chord) {
    return '';
  }

  if (chord.special === 'N.C.') {
    return 'N.C.';
  }

  if (chord.special === 'x') {
    return 'x';
  }

  let result = chord.note;

  // Add accidental
  if (chord.accidental) {
    result += chord.accidental;
  }

  // Add quality
  if (chord.quality === 'minor') {
    result += 'm';
  } else if (chord.quality === 'major') {
    // Only add 'maj' if it was explicitly present AND there's an extension
    // "maj" always comes with a number (maj7, maj9, etc.)
    if (chord.explicitMaj && chord.extension) {
      result += 'maj';
    }
  } else if (chord.quality === 'dim') {
    result += 'dim';
  } else if (chord.quality === 'aug') {
    result += 'aug';
  } else if (chord.quality === 'sus2') {
    result += 'sus2';
  } else if (chord.quality === 'sus4') {
    result += 'sus4';
  }

  // Add extension
  if (chord.extension) {
    result += chord.extension;
  }

  // Add add
  if (chord.add) {
    result += `add${chord.add}`;
  }

  // Add inversion
  if (chord.inversion) {
    result += `/${chord.inversion}`;
  }

  return result;
}

/**
 * Normalizes chord strings to Chord objects
 * Useful for converting existing string-based chord sheets
 */
export function normalizeChord(chord: string | Chord): Chord | null {
  if (typeof chord === 'string') {
    return parseChord(chord);
  }
  return chord;
}

/**
 * Normalizes an array of chords (mixed string/Chord) to Chord[]
 */
export function normalizeChords(chords: (string | Chord)[]): (Chord | null)[] {
  return chords.map(chord => normalizeChord(chord));
}


