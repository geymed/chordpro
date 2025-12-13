import { NextRequest, NextResponse } from 'next/server';
import { ChordSheet } from '@/types';
import { getSheetById, updateSheet, deleteSheet } from '@/lib/db';
import { validateChordSheetStrict } from '@/lib/strict-chord-validator';

// GET /api/sheets/[id] - Get a specific sheet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sheet = await getSheetById(id);
    
    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }
    
    return NextResponse.json(sheet);
  } catch (error: any) {
    console.error('Error fetching sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sheet', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/sheets/[id] - Update a sheet
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingSheet = await getSheetById(id);
    
    if (!existingSheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }
    
    const body = await request.json();
    
    // Apply STRICT chord validation before updating
    try {
      const validatedSheet = validateChordSheetStrict({
        ...existingSheet,
        ...body,
        id,
      });
      
      const updatedSheet: ChordSheet = validatedSheet as ChordSheet;
      const result = await updateSheet(updatedSheet);
      return NextResponse.json(result);
    } catch (validationError: any) {
      console.error('Validation error:', validationError);
      return NextResponse.json(
        { error: 'Validation failed', details: validationError.message || 'Invalid chord sheet data' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error updating sheet:', error);
    return NextResponse.json(
      { error: 'Failed to update sheet', details: error.message || String(error) },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}

// DELETE /api/sheets/[id] - Delete a sheet
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteSheet(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting sheet:', error);
    return NextResponse.json(
      { error: 'Failed to delete sheet', details: error.message },
      { status: 500 }
    );
  }
}

