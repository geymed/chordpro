import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

// This endpoint initializes the database schema
// Call this once after setting up Vercel Postgres
// GET /api/init-db

export async function GET() {
  try {
    // Log environment variables for debugging (without exposing values)
    const postgresUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || '';
    const maskedUrl = postgresUrl ? postgresUrl.replace(/:([^:@]+)@/, ':****@') : 'none';
    
    const envCheck = {
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasPostgresPrisma: !!process.env.POSTGRES_PRISMA_URL,
      hasPostgresNonPooling: !!process.env.POSTGRES_URL_NON_POOLING,
      postgresEnvVars: Object.keys(process.env).filter(k => k.includes('POSTGRES')),
      isVercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV,
      connectionStringPreview: maskedUrl.substring(0, 100),
      isSupabase: postgresUrl.includes('supabase.co') || postgresUrl.includes('supabase.com'),
      isNeon: postgresUrl.includes('neon.tech'),
      isVercelPostgres: !!(process.env.POSTGRES_HOST && process.env.POSTGRES_USER)
    };
    console.log('🔍 Environment check:', envCheck);
    
    await initDatabase();
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully',
      envCheck: {
        hasPostgresUrl: envCheck.hasPostgresUrl,
        hasPostgresPrisma: envCheck.hasPostgresPrisma,
        postgresEnvVarCount: envCheck.postgresEnvVars.length
      }
    });
  } catch (error: any) {
    console.error('Database initialization error:', error);
    
    // Provide detailed error information
    const envVars = Object.keys(process.env).filter(k => k.includes('POSTGRES'));
    const errorDetails = {
      message: error.message || 'Database initialization failed',
      code: error.code,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      foundPostgresEnvVars: envVars,
      isVercel: !!process.env.VERCEL
    };
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Database initialization failed',
        details: errorDetails
      },
      { status: 500 }
    );
  }
}

