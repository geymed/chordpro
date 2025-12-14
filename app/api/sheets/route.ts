import { NextRequest, NextResponse } from 'next/server';
import { ChordSheet } from '@/types';
import { getAllSheets, createSheet } from '@/lib/db';
import { validateChordSheetStrict } from '@/lib/strict-chord-validator';

// GET /api/sheets - Get all sheets
export async function GET() {
  try {
    const sheets = await getAllSheets();
    return NextResponse.json(sheets);
  } catch (error: any) {
    console.error('Error fetching sheets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sheets', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/sheets - Create a new sheet
// Uses STRICT chord validation to ensure data integrity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.artist || !body.sections) {
      return NextResponse.json(
        { error: 'Missing required fields: title, artist, sections' },
        { status: 400 }
      );
    }

    // Apply STRICT chord validation before saving
    const validatedSheet = validateChordSheetStrict({
      ...body,
      id: body.id || `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dateAdded: body.dateAdded || new Date().toISOString().split('T')[0],
    });

    const newSheet: ChordSheet = validatedSheet as ChordSheet;
    const created = await createSheet(newSheet);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sheet:', error);
    return NextResponse.json(
      { error: 'Failed to create sheet', details: error.message },
      { status: 400 }
    );
  }
}

