# Database Setup Guide

This guide will help you set up Vercel Postgres for your ChordVault application.

## Step 1: Install Dependencies

The `@vercel/postgres` package is already added to `package.json`. Install it:

```bash
npm install
```

## Step 2: Set Up Vercel Postgres

### Option A: Via Vercel Dashboard (Recommended)

1. **Deploy your app to Vercel first** (if not already deployed)
   - Push to GitHub
   - Import to Vercel
   - Deploy

2. **Add Vercel Postgres to your project:**
   - Go to your Vercel project dashboard
   - Click on the **"Storage"** tab
   - Click **"Create Database"**
   - Select **"Postgres"**
   - Choose a name (e.g., `chordvault-db`)
   - Select a region (choose closest to your users)
   - Click **"Create"**

3. **Environment Variables are Auto-Configured:**
   - Vercel automatically adds the connection variables
   - No manual configuration needed!

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Link your project (if not already linked)
vercel link

# Create Postgres database
vercel postgres create chordvault-db
```

## Step 3: Initialize the Database Schema

After setting up the database, you need to create the tables. You have two options:

### Option A: Via API Endpoint (Easiest)

1. After deploying, visit:
   ```
   https://your-app.vercel.app/api/init-db
   ```

2. You should see:
   ```json
   { "success": true, "message": "Database initialized successfully" }
   ```

### Option B: Via Local Script

```bash
# Set environment variables locally (get from Vercel dashboard)
export POSTGRES_URL="your-postgres-url"
export POSTGRES_PRISMA_URL="your-prisma-url"
export POSTGRES_URL_NON_POOLING="your-non-pooling-url"

# Run initialization
npx tsx lib/db-init.ts
```

## Step 4: Verify It's Working

1. Visit your deployed app
2. The app should now use the database instead of in-memory storage
3. Data will persist across deployments and cold starts!

## Migration from In-Memory to Database

The API routes have been updated to use the database. The old in-memory storage (`lib/api-storage.ts`) is no longer used.

## Database Schema

The database includes:

- **sheets table**: Stores all chord sheets
  - `id` (primary key)
  - `title`, `title_en`
  - `artist`, `artist_en`
  - `language` (he/en)
  - `key`, `tempo`, `capo`
  - `sections` (JSONB - stores the chord sections)
  - `date_added`
  - `created_at`, `updated_at`

- **Indexes**: For faster searches on language and title

## Troubleshooting

### "Table does not exist" error

Run the initialization endpoint:
```
https://your-app.vercel.app/api/init-db
```

### Connection errors

1. Check that Vercel Postgres is created in your project
2. Verify environment variables are set in Vercel dashboard
3. Make sure you're using the correct database region

### Local development

For local development, you can:
1. Use Vercel's local development with `vercel dev` (it will use your production database)
2. Or set up a local Postgres instance and use those connection strings

## Next Steps

- ✅ Database is set up
- ✅ API routes use the database
- ✅ Data persists across deployments
- 🎉 Your app is production-ready!

## Optional: Seed Initial Data

If you want to add the default sample songs to the database, you can create a seed script or manually add them through the UI after deployment.

