import { Pool } from 'pg';
import { ChordSheet, Section } from '@/types';

// Import validation functions from llm-analyzer
// We'll define them here to avoid circular dependencies
function isValidChord(chord: string): boolean {
  if (!chord || chord.trim() === '') return true;
  const trimmed = chord.trim();
  const chordPattern = /^[A-G](?:#|b)?(?:m(?:aj|in)?|dim|aug|sus[24]?|add[2469]|maj|min)?(?:\d+|\([^)]+\))?(?:\/[A-G](?:#|b)?)?$/i;
  const extendedPattern = /^[A-G](?:#|b)?(?:m(?:aj|in)?|dim|aug|sus[24]?|add[2469]|maj|min)?(?:\d+|\([^)]+\))*(?:\/[A-G](?:#|b)?)?$/i;
  const specialCases = /^(N\.?C\.?|x|X|\d+)$/i;
  return chordPattern.test(trimmed) || extendedPattern.test(trimmed) || specialCases.test(trimmed);
}

function findClosestValidChord(invalidChord: string): string {
  const trimmed = invalidChord.trim();

  // First, handle truncated "di" -> "dim" BEFORE any other processing
  // This must come first to catch cases like "G#di"
  if (/^[A-G][#b]?di$/i.test(trimmed)) {
    const fixed = trimmed.replace(/di$/i, 'dim');
    if (isValidChord(fixed)) {
      return fixed;
    }
  }

  let cleaned = trimmed.replace(/\s+/g, '').replace(/[^\w#\/]/g, '');

  const fixes: { pattern: RegExp; replacement: string }[] = [
    // Fix "diminished" - handle truncated "di" -> "dim" (check again after cleaning)
    { pattern: /([A-G][#b]?)di$/i, replacement: '$1dim' },
    { pattern: /([A-G][#b]?)\s*diminished/gi, replacement: '$1dim' },
    { pattern: /([A-G][#b]?)\s*dim/gi, replacement: '$1dim' },
    { pattern: /([A-G][#b]?)\s*minor/gi, replacement: '$1m' },
    { pattern: /([A-G][#b]?)\s*min/gi, replacement: '$1m' },
    { pattern: /([A-G][#b]?)\s*major/gi, replacement: '$1maj' },
    { pattern: /([A-G])\s*sharp/gi, replacement: '$1#' },
    { pattern: /([A-G])\s*flat/gi, replacement: '$1b' },
    { pattern: /[^A-G#bmajdimaugsusadd\/\d()]/gi, replacement: '' },
  ];

  for (const fix of fixes) {
    cleaned = cleaned.replace(fix.pattern, fix.replacement);
  }

  const rootMatch = cleaned.match(/^([A-G][#b]?)/i);
  if (rootMatch) {
    const root = rootMatch[1];
    const rest = cleaned.substring(rootMatch[0].length);

    // Check if rest contains "dim" or "di" (truncated dim) - prioritize dim
    if (rest.match(/^di$/i) || rest.match(/^dim/i)) {
      const dimChord = root + 'dim';
      if (isValidChord(dimChord)) {
        return dimChord;
      }
    }

    const commonPatterns = [root, root + 'm', root + 'dim', root + 'aug', root + '7', root + 'm7', root + 'maj7', root + '9', root + 'm9'];

    for (const pattern of commonPatterns) {
      if (isValidChord(pattern)) {
        const slashMatch = rest.match(/\/([A-G][#b]?)/i);
        if (slashMatch) {
          const inversion = pattern + '/' + slashMatch[1];
          if (isValidChord(inversion)) return inversion;
        }
        return pattern;
      }
    }
    return root;
  }
  return '';
}

function validateAndFixChordSheet(sheet: ChordSheet): ChordSheet {
  // For now, we just return the sheet as is since we moved to string-based chords
  // We can add string-based validation later if needed
  return sheet;
}

// Load environment variables from .env.local if not in production
if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8');
      envFile.split('\n').forEach((line: string) => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (error) {
    // Ignore errors loading .env.local
  }
}

// Determine if we're using local PostgreSQL or Vercel Postgres
const postgresUrl = process.env.POSTGRES_URL || '';
const isLocalPostgres = postgresUrl.includes('localhost') ||
  postgresUrl.includes('127.0.0.1') ||
  (!process.env.VERCEL && postgresUrl && !postgresUrl.includes('neon.tech') && !postgresUrl.includes('vercel-storage.com'));

// Create pg Pool for local PostgreSQL
let pgPool: Pool | null = null;
let vercelSql: any = null;

if (isLocalPostgres && postgresUrl) {
  console.log('Using local PostgreSQL with pg driver');
  pgPool = new Pool({
    connectionString: postgresUrl,
  });
} else {
  console.log('Using Vercel Postgres');
  // Lazy load @vercel/postgres only when needed
  vercelSql = require('@vercel/postgres').sql;
}

// SQL query function that works with both local PostgreSQL and Vercel Postgres
async function sql(strings: TemplateStringsArray, ...values: any[]) {
  if (isLocalPostgres && pgPool) {
    // Use pg for local PostgreSQL
    const query = strings.reduce((acc, str, i) => {
      return acc + str + (i < values.length ? `$${i + 1}` : '');
    }, '');
    const result = await pgPool.query(query, values);
    return { rows: result.rows, rowCount: result.rowCount || 0 };
  } else {
    // Use @vercel/postgres for Vercel Postgres
    if (!vercelSql) {
      vercelSql = require('@vercel/postgres').sql;
    }
    return vercelSql(strings, ...values);
  }
}

// Initialize database schema
export async function initDatabase() {
  try {
    // Create sheets table
    await sql`
      CREATE TABLE IF NOT EXISTS sheets (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        title_en VARCHAR(255),
        artist VARCHAR(255) NOT NULL,
        artist_en VARCHAR(255),
        language VARCHAR(10) NOT NULL,
        key VARCHAR(10),
        tempo VARCHAR(50),
        capo INTEGER,
        sections JSONB NOT NULL,
        date_added DATE NOT NULL,
        image_data TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Check if image_data column exists, add it if missing (migration)
    try {
      await sql`
        ALTER TABLE sheets ADD COLUMN IF NOT EXISTS image_data TEXT
      `;
    } catch (alterError) {
      // Column might already exist or there's a different issue, continue
    }

    // Create index for faster searches
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sheets_language ON sheets(language)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sheets_title ON sheets(title)
    `;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Convert database row to ChordSheet
function rowToSheet(row: any): ChordSheet {
  try {
    // Parse sections if it's a string (JSONB from database)
    let sectionsData = row.sections;
    if (typeof sectionsData === 'string') {
      try {
        sectionsData = JSON.parse(sectionsData);
      } catch (e) {
        console.error('Failed to parse sections JSON:', e);
        sectionsData = [];
      }
    }

    // Normalize sections - handle both old format (chords array) and new format (words array)
    const sections: Section[] = (sectionsData || []).map((section: any, idx: number) => {
      if (!section) {
        return {
          id: `section-${idx}`,
          label: 'Untitled Section',
          lines: []
        };
      }

      const normalizedLines = (section.lines || []).map((line: any) => {
        if (!line) {
          return { words: [] };
        }

        // Handle new format: words array
        if (Array.isArray(line.words)) {
          return {
            words: line.words.map((word: any) => {
              // Ensure each word has the correct structure
              if (typeof word === 'string') {
                return { word };
              }
              if (word && typeof word === 'object') {
                return {
                  word: word.word || '',
                  chord: word.chord || undefined
                };
              }
              return { word: '' };
            }).filter((w: any) => w.word !== undefined && w.word !== null)
          };
        }

        // Handle old format: chords and lyrics arrays (backward compatibility)
        if (Array.isArray(line.chords) && typeof line.lyrics === 'string') {
          const lyrics = line.lyrics.split(/\s+/).filter((w: string) => w.trim());
          return {
            words: lyrics.map((word: string, idx: number) => ({
              word,
              chord: line.chords[idx] || undefined
            }))
          };
        }

        // Fallback: empty words array
        return { words: [] };
      });

      return {
        id: section.id || `section-${idx}`,
        type: section.type,
        label: section.label || 'Untitled Section',
        lines: normalizedLines
      };
    });

    return {
      id: row.id,
      title: row.title || 'Untitled Song',
      titleEn: row.title_en || undefined,
      artist: row.artist || 'Unknown Artist',
      artistEn: row.artist_en || undefined,
      language: (row.language as 'he' | 'en') || 'en',
      key: row.key || undefined,
      tempo: row.tempo || undefined,
      capo: row.capo !== null && row.capo !== undefined ? row.capo : undefined,
      sections,
      dateAdded: row.date_added || new Date().toISOString().split('T')[0],
      imageData: row.image_data || undefined,
    };
  } catch (error) {
    console.error('Error converting row to sheet:', error, row);
    // Return a minimal valid sheet to prevent crashes
    return {
      id: row.id || `sheet-${Date.now()}`,
      title: row.title || 'Untitled Song',
      artist: row.artist || 'Unknown Artist',
      language: 'en',
      sections: [],
      dateAdded: row.date_added || new Date().toISOString().split('T')[0],
    };
  }
}

// Get all sheets
export async function getAllSheets(): Promise<ChordSheet[]> {
  try {
    const { rows } = await sql`
      SELECT * FROM sheets
      ORDER BY date_added DESC, created_at DESC
    `;
    return rows.map(rowToSheet);
  } catch (error) {
    console.error('Error fetching sheets:', error);
    throw error;
  }
}

// Get a single sheet by ID
export async function getSheetById(id: string): Promise<ChordSheet | null> {
  try {
    const { rows } = await sql`
      SELECT * FROM sheets WHERE id = ${id}
    `;
    if (rows.length === 0) return null;
    return rowToSheet(rows[0]);
  } catch (error) {
    console.error('Error fetching sheet:', error);
    throw error;
  }
}

// Create a new sheet
export async function createSheet(sheet: ChordSheet): Promise<ChordSheet> {
  try {
    // Validate and fix chord names before saving
    const validatedSheet = validateAndFixChordSheet(sheet);

    // Truncate string fields to fit database constraints
    const truncatedSheet = {
      ...validatedSheet,
      title: validatedSheet.title.substring(0, 255),
      titleEn: validatedSheet.titleEn ? validatedSheet.titleEn.substring(0, 255) : undefined,
      artist: validatedSheet.artist.substring(0, 255),
      artistEn: validatedSheet.artistEn ? validatedSheet.artistEn.substring(0, 255) : undefined,
      key: validatedSheet.key ? validatedSheet.key.substring(0, 10) : undefined,
      tempo: validatedSheet.tempo ? validatedSheet.tempo.substring(0, 50) : undefined,
    };

    // Try INSERT with image_data first, fallback to without if column doesn't exist
    try {
      await sql`
        INSERT INTO sheets (
          id, title, title_en, artist, artist_en, language, key, tempo, capo, sections, date_added, image_data
        ) VALUES (
          ${truncatedSheet.id},
          ${truncatedSheet.title},
          ${truncatedSheet.titleEn || null},
          ${truncatedSheet.artist},
          ${truncatedSheet.artistEn || null},
          ${truncatedSheet.language},
          ${truncatedSheet.key || null},
          ${truncatedSheet.tempo || null},
          ${truncatedSheet.capo !== undefined ? truncatedSheet.capo : null},
          ${JSON.stringify(truncatedSheet.sections)},
          ${truncatedSheet.dateAdded},
          ${truncatedSheet.imageData || null}
        )
      `;
    } catch (insertError: any) {
      // If error is about missing column, try without image_data
      if (insertError?.code === '42703' || (insertError?.message && insertError.message.includes('image_data'))) {
        // Try to add the column first (migration on-the-fly)
        try {
          await sql`ALTER TABLE sheets ADD COLUMN IF NOT EXISTS image_data TEXT`;
          
          // Retry with image_data
          await sql`
            INSERT INTO sheets (
              id, title, title_en, artist, artist_en, language, key, tempo, capo, sections, date_added, image_data
            ) VALUES (
              ${truncatedSheet.id},
              ${truncatedSheet.title},
              ${truncatedSheet.titleEn || null},
              ${truncatedSheet.artist},
              ${truncatedSheet.artistEn || null},
              ${truncatedSheet.language},
              ${truncatedSheet.key || null},
              ${truncatedSheet.tempo || null},
              ${truncatedSheet.capo !== undefined ? truncatedSheet.capo : null},
              ${JSON.stringify(truncatedSheet.sections)},
              ${truncatedSheet.dateAdded},
              ${truncatedSheet.imageData || null}
            )
          `;
        } catch (retryError) {
          // If adding column failed, try INSERT without image_data as last resort
          await sql`
            INSERT INTO sheets (
              id, title, title_en, artist, artist_en, language, key, tempo, capo, sections, date_added
            ) VALUES (
              ${truncatedSheet.id},
              ${truncatedSheet.title},
              ${truncatedSheet.titleEn || null},
              ${truncatedSheet.artist},
              ${truncatedSheet.artistEn || null},
              ${truncatedSheet.language},
              ${truncatedSheet.key || null},
              ${truncatedSheet.tempo || null},
              ${truncatedSheet.capo !== undefined ? truncatedSheet.capo : null},
              ${JSON.stringify(truncatedSheet.sections)},
              ${truncatedSheet.dateAdded}
            )
          `;
        }
      } else {
        // Different error, re-throw
        throw insertError;
      }
    }
    return truncatedSheet;
  } catch (error) {
    console.error('Error creating sheet:', error);
    throw error;
  }
}

// Update an existing sheet
export async function updateSheet(sheet: ChordSheet): Promise<ChordSheet> {
  try {
    // Validate and fix chord names before saving
    const validatedSheet = validateAndFixChordSheet(sheet);

    // Truncate string fields to fit database constraints
    const truncatedSheet = {
      ...validatedSheet,
      title: validatedSheet.title.substring(0, 255),
      titleEn: validatedSheet.titleEn ? validatedSheet.titleEn.substring(0, 255) : undefined,
      artist: validatedSheet.artist.substring(0, 255),
      artistEn: validatedSheet.artistEn ? validatedSheet.artistEn.substring(0, 255) : undefined,
      key: validatedSheet.key ? validatedSheet.key.substring(0, 10) : undefined,
      tempo: validatedSheet.tempo ? validatedSheet.tempo.substring(0, 50) : undefined,
    };

    await sql`
      UPDATE sheets SET
        title = ${truncatedSheet.title},
        title_en = ${truncatedSheet.titleEn || null},
        artist = ${truncatedSheet.artist},
        artist_en = ${truncatedSheet.artistEn || null},
        language = ${truncatedSheet.language},
        key = ${truncatedSheet.key || null},
        tempo = ${truncatedSheet.tempo || null},
        capo = ${truncatedSheet.capo !== undefined ? truncatedSheet.capo : null},
        sections = ${JSON.stringify(truncatedSheet.sections)},
        image_data = ${truncatedSheet.imageData || null},
        updated_at = NOW()
      WHERE id = ${truncatedSheet.id}
    `;
    return truncatedSheet;
  } catch (error) {
    console.error('Error updating sheet:', error);
    throw error;
  }
}

// Delete a sheet
export async function deleteSheet(id: string): Promise<boolean> {
  try {
    const { rowCount } = await sql`
      DELETE FROM sheets WHERE id = ${id}
    `;
    return rowCount > 0;
  } catch (error) {
    console.error('Error deleting sheet:', error);
    throw error;
  }
}

