import { initDatabase } from './db';

// Load environment variables from .env.local for local development
if (process.env.NODE_ENV !== 'production') {
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

// This file can be used to initialize the database
// Run this once after setting up Vercel Postgres or local PostgreSQL

export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? 'SET' : 'NOT SET');
    await initDatabase();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// If running directly (e.g., via script)
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

