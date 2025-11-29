import { ChordSheet } from '../types';

export interface ChordSheetFile {
  version: '1.0';
  metadata: {
    source?: string;
    sourceUrl?: string;
    createdAt: string;
    updatedAt?: string;
  };
  sheet: ChordSheet;
}

/**
 * Validates a chord sheet file structure
 */
export function validateChordSheetFile(file: any): ChordSheet {
  // Validate version
  if (file.version !== '1.0') {
    throw new Error(`Unsupported file version: ${file.version}. Expected version 1.0`);
  }

  // Validate structure
  if (!file.sheet) {
    throw new Error('Invalid file structure: missing "sheet" property');
  }

  const sheet = file.sheet;

  // Validate required fields
  if (!sheet.id || typeof sheet.id !== 'string') {
    throw new Error('Invalid sheet: missing or invalid "id" field');
  }

  if (!sheet.title || typeof sheet.title !== 'string') {
    throw new Error('Invalid sheet: missing or invalid "title" field');
  }

  if (!sheet.artist || typeof sheet.artist !== 'string') {
    throw new Error('Invalid sheet: missing or invalid "artist" field');
  }

  if (!sheet.language || !['he', 'en'].includes(sheet.language)) {
    throw new Error('Invalid sheet: missing or invalid "language" field (must be "he" or "en")');
  }

  if (!sheet.sections || !Array.isArray(sheet.sections)) {
    throw new Error('Invalid sheet: missing or invalid "sections" field (must be an array)');
  }

  // Validate sections
  for (let i = 0; i < sheet.sections.length; i++) {
    const section = sheet.sections[i];
    if (!section.id || typeof section.id !== 'string') {
      throw new Error(`Invalid section ${i}: missing or invalid "id" field`);
    }
    if (!section.type || !['verse', 'chorus', 'bridge', 'intro', 'outro'].includes(section.type)) {
      throw new Error(`Invalid section ${i}: missing or invalid "type" field`);
    }
    if (!section.lines || !Array.isArray(section.lines)) {
      throw new Error(`Invalid section ${i}: missing or invalid "lines" field (must be an array)`);
    }

    // Validate lines
    for (let j = 0; j < section.lines.length; j++) {
      const line = section.lines[j];
      if (!line.chords || !Array.isArray(line.chords)) {
        throw new Error(`Invalid line ${j} in section ${i}: missing or invalid "chords" field (must be an array)`);
      }
      if (typeof line.lyrics !== 'string') {
        throw new Error(`Invalid line ${j} in section ${i}: missing or invalid "lyrics" field (must be a string)`);
      }
    }
  }

  return sheet;
}

/**
 * Creates a chord sheet file from a ChordSheet object
 */
export function createChordSheetFile(sheet: ChordSheet, metadata?: {
  source?: string;
  sourceUrl?: string;
}): ChordSheetFile {
  const now = new Date().toISOString();

  return {
    version: '1.0',
    metadata: {
      ...metadata,
      createdAt: now,
    },
    sheet,
  };
}

