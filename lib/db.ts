import { sql } from '@vercel/postgres';
import { ChordSheet, Section, ChordLine } from '@/types';

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
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

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
  return {
    id: row.id,
    title: row.title,
    titleEn: row.title_en || undefined,
    artist: row.artist,
    artistEn: row.artist_en || undefined,
    language: row.language as 'he' | 'en',
    key: row.key || undefined,
    tempo: row.tempo || undefined,
    capo: row.capo !== null ? row.capo : undefined,
    sections: row.sections as Section[],
    dateAdded: row.date_added,
  };
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
    await sql`
      INSERT INTO sheets (
        id, title, title_en, artist, artist_en, language, key, tempo, capo, sections, date_added
      ) VALUES (
        ${sheet.id},
        ${sheet.title},
        ${sheet.titleEn || null},
        ${sheet.artist},
        ${sheet.artistEn || null},
        ${sheet.language},
        ${sheet.key || null},
        ${sheet.tempo || null},
        ${sheet.capo !== undefined ? sheet.capo : null},
        ${JSON.stringify(sheet.sections)},
        ${sheet.dateAdded}
      )
    `;
    return sheet;
  } catch (error) {
    console.error('Error creating sheet:', error);
    throw error;
  }
}

// Update an existing sheet
export async function updateSheet(sheet: ChordSheet): Promise<ChordSheet> {
  try {
    await sql`
      UPDATE sheets SET
        title = ${sheet.title},
        title_en = ${sheet.titleEn || null},
        artist = ${sheet.artist},
        artist_en = ${sheet.artistEn || null},
        language = ${sheet.language},
        key = ${sheet.key || null},
        tempo = ${sheet.tempo || null},
        capo = ${sheet.capo !== undefined ? sheet.capo : null},
        sections = ${JSON.stringify(sheet.sections)},
        updated_at = NOW()
      WHERE id = ${sheet.id}
    `;
    return sheet;
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

