import { initDatabase } from './db';

// This file can be used to initialize the database
// Run this once after setting up Vercel Postgres

export async function initializeDatabase() {
  try {
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

