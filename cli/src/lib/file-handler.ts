import * as fs from 'fs';
import * as path from 'path';
import { ChordSheet } from '../types';
import { validateChordSheetFile, createChordSheetFile, ChordSheetFile } from './chord-sheet-format';

/**
 * Reads a chord sheet file from disk
 */
export function readChordSheetFile(filePath: string): ChordSheet {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const file = JSON.parse(content);
    return validateChordSheetFile(file);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read chord sheet file ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Writes a chord sheet file to disk
 */
export function writeChordSheetFile(filePath: string, sheet: ChordSheet, metadata?: {
  source?: string;
  sourceUrl?: string;
}): void {
  try {
    const file = createChordSheetFile(sheet, metadata);
    const content = JSON.stringify(file, null, 2);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to write chord sheet file ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Reads all chord sheet files from a directory
 */
export function readChordSheetFilesFromDirectory(dirPath: string): ChordSheet[] {
  const sheets: ChordSheet[] = [];

  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dirPath, file);
        try {
          const sheet = readChordSheetFile(filePath);
          sheets.push(sheet);
        } catch (error) {
          console.warn(`Skipping invalid file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  } catch (error) {
    throw new Error(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return sheets;
}

/**
 * Validates a chord sheet file without reading it
 */
export function validateChordSheetFileFromPath(filePath: string): boolean {
  try {
    readChordSheetFile(filePath);
    return true;
  } catch {
    return false;
  }
}

