import { NextRequest, NextResponse } from 'next/server';
import { ChordSheet } from '@/types';
import { getSheets, saveSheet } from '@/lib/api-storage';

// GET /api/sheets - Get all sheets
export async function GET() {
  const sheets = getSheets();
  return NextResponse.json(sheets);
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
    saveSheet(newSheet);
    return NextResponse.json(newSheet, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

