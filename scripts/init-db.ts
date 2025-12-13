#!/usr/bin/env tsx
/**
 * Standalone script to initialize the database schema
 * Can be run locally or in any environment with POSTGRES_URL set
 * 
 * Usage:
 *   npx tsx scripts/init-db.ts
 * 
 * Or with explicit connection string:
 *   POSTGRES_URL="postgresql://..." npx tsx scripts/init-db.ts
 * 
 * For Supabase:
 *   1. Go to Supabase Dashboard → Settings → Database
 *   2. Copy the "Connection string" (URI format)
 *   3. Run: POSTGRES_URL="postgresql://..." npx tsx scripts/init-db.ts
 */

import { initDatabase } from '../lib/db';

async function main() {
  const postgresUrl = process.env.POSTGRES_URL || 
                     process.env.POSTGRES_PRISMA_URL || 
                     process.env.POSTGRES_URL_NON_POOLING;

  if (!postgresUrl) {
    console.error('❌ Error: POSTGRES_URL environment variable is not set');
    console.error('\nPlease set one of:');
    console.error('  - POSTGRES_URL');
    console.error('  - POSTGRES_PRISMA_URL');
    console.error('  - POSTGRES_URL_NON_POOLING');
    console.error('\nFor Supabase:');
    console.error('  1. Go to Supabase Dashboard → Settings → Database');
    console.error('  2. Copy the "Connection string" (URI format)');
    console.error('  3. Run: POSTGRES_URL="postgresql://..." npm run init-db');
    console.error('\nExample:');
    console.error('  POSTGRES_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" npm run init-db');
    process.exit(1);
  }

  // Detect database provider
  const isSupabase = postgresUrl.includes('supabase.co') || postgresUrl.includes('supabase.com');
  const isVercel = postgresUrl.includes('vercel-storage.com') || postgresUrl.includes('neon.tech');
  
  // Mask password in connection string for logging
  const maskedUrl = postgresUrl.replace(/:([^:@]+)@/, ':****@');
  console.log('📊 Database connection:', maskedUrl);
  console.log('🔌 Provider:', isSupabase ? 'Supabase' : isVercel ? 'Vercel Postgres' : 'PostgreSQL');
  console.log('🚀 Initializing database schema...\n');

  try {
    await initDatabase();
    console.log('\n✅ Database initialized successfully!');
    console.log('   Tables created:');
    console.log('   - sheets (with indexes)');
    console.log('   - image_data column (if needed)');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Database initialization failed:');
    console.error('   Error:', error?.message || error);
    if (error?.code) {
      console.error('   Code:', error.code);
    }
    if (error?.detail) {
      console.error('   Detail:', error.detail);
    }
    console.error('\nTroubleshooting:');
    console.error('1. Verify the connection string is correct');
    console.error('2. Check that the database exists and is accessible');
    console.error('3. Ensure your IP is allowed (for cloud databases)');
    console.error('4. Verify SSL settings if required');
    process.exit(1);
  }
}

main();

