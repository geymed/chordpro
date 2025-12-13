# Database Initialization Guide

You can initialize the database from outside (locally) using the provided script.

## Option 1: Using the Script (Recommended)

### For Supabase:

1. **Get your Supabase connection string:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project: `gyhkzmsyrymgfhhwtcwi`
   - Navigate to **Settings** → **Database**
   - Scroll to **Connection string** section
   - Copy the **URI** connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`)

2. **Run the initialization script:**
   ```bash
   POSTGRES_URL="postgresql://postgres:YOUR_PASSWORD@db.gyhkzmsyrymgfhhwtcwi.supabase.co:5432/postgres" npm run init-db
   ```

   Or if you have it in your `.env.local`:
   ```bash
   # Add to .env.local:
   POSTGRES_URL=postgresql://postgres:YOUR_PASSWORD@db.gyhkzmsyrymgfhhwtcwi.supabase.co:5432/postgres
   
   # Then run:
   npm run init-db
   ```

### For Vercel Postgres:

If you're using Vercel Postgres, you can get the connection string from:
- Vercel Dashboard → Your Project → Storage → Postgres → Settings → Connection String

Then run:
```bash
POSTGRES_URL="your-vercel-postgres-url" npm run init-db
```

## Option 2: Using Supabase SQL Editor

Alternatively, you can run the SQL directly in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- Create sheets table
CREATE TABLE IF NOT EXISTS sheets (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  artist VARCHAR(255) NOT NULL,
  artist_en VARCHAR(255),
  language VARCHAR(10) NOT NULL,
  key VARCHAR(10),
  tempo VARCHAR(50),
  capo INTEGER,
  sections JSONB NOT NULL,
  date_added DATE NOT NULL,
  image_data TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add image_data column if it doesn't exist (for existing tables)
ALTER TABLE sheets ADD COLUMN IF NOT EXISTS image_data TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sheets_language ON sheets(language);
CREATE INDEX IF NOT EXISTS idx_sheets_title ON sheets(title);
```

## Option 3: Using the API Endpoint

After deploying to Vercel, you can also initialize via the API:
```
GET https://your-app.vercel.app/api/init-db
```

## Troubleshooting

- **Connection refused**: Make sure your IP is allowed in Supabase (Settings → Database → Connection Pooling → Allowed IPs)
- **Authentication failed**: Double-check your password in the connection string
- **SSL required**: Supabase requires SSL, which is handled automatically by the script

