import { NextRequest, NextResponse } from 'next/server';
import { ChordSheet } from '@/types';
import { getAllSheets, createSheet } from '@/lib/db';

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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newSheet: ChordSheet = {
      ...body,
      id: body.id || `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dateAdded: body.dateAdded || new Date().toISOString().split('T')[0],
    };
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

