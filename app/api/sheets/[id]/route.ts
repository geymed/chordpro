import { NextRequest, NextResponse } from 'next/server';
import { ChordSheet } from '@/types';
import { getSheet, saveSheet, deleteSheet as deleteSheetStorage } from '@/lib/api-storage';

// GET /api/sheets/[id] - Get a specific sheet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sheet = getSheet(id);
  
  if (!sheet) {
    return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
  }
  
  return NextResponse.json(sheet);
}

// PUT /api/sheets/[id] - Update a sheet
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existingSheet = getSheet(id);
  
  if (!existingSheet) {
    return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
  }
  
  try {
    const body = await request.json();
    const updatedSheet: ChordSheet = { ...existingSheet, ...body, id };
    saveSheet(updatedSheet);
    return NextResponse.json(updatedSheet);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/sheets/[id] - Delete a sheet
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const success = deleteSheetStorage(id);
  
  if (!success) {
    return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
  }
  
  return NextResponse.json({ success: true });
}

