import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

// This endpoint initializes the database schema
// Call this once after setting up Vercel Postgres
// GET /api/init-db

export async function GET() {
  try {
    await initDatabase();
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully' 
    });
  } catch (error: any) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Database initialization failed' 
      },
      { status: 500 }
    );
  }
}

