# Database Setup Guide

This guide will help you set up Vercel Postgres for your ChordVault application.

## Step 1: Install Dependencies

The `@vercel/postgres` package is already added to `package.json`. Install it:

```bash
npm install
```

## Step 2: Set Up Database

### Option A: Local PostgreSQL (For Local Development)

If you already have PostgreSQL images installed locally, you can use them for local development:

1. **Start your PostgreSQL container/image:**
   ```bash
   # Example with Docker (adjust based on your setup)
   docker ps  # Check if PostgreSQL is already running
   docker start <postgres-container-name>  # If stopped
   # OR
   docker run -d --name chordpro-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=chordvault -p 5432:5432 postgres:latest
   ```

2. **Create a database** (if not already created):
   ```bash
   # Connect to PostgreSQL
   psql -h localhost -U postgres
   # OR if using Docker:
   docker exec -it <postgres-container-name> psql -U postgres
   
   # Create database
   CREATE DATABASE chordvault;
   \q
   ```

3. **Set up environment variables locally:**
   
   Create a `.env.local` file in your project root (or add to existing `.env.local`):
   ```bash
   POSTGRES_URL="postgresql://postgres:password@localhost:5432/chordvault"
   POSTGRES_PRISMA_URL="postgresql://postgres:password@localhost:5432/chordvault"
   POSTGRES_URL_NON_POOLING="postgresql://postgres:password@localhost:5432/chordvault"
   ```
   
   **Adjust the connection string based on your setup:**
   - Replace `postgres` with your PostgreSQL username
   - Replace `password` with your PostgreSQL password
   - Replace `localhost:5432` with your host and port if different
   - Replace `chordvault` with your database name

4. **Initialize the database schema:**
   ```bash
   npx tsx lib/db-init.ts
   ```

5. **Start your development server:**
   ```bash
   npm run dev
   ```

### Option B: Via Vercel Dashboard (For Production)

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

### Option C: Via Vercel CLI

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
1. **Use your existing local PostgreSQL** (see Option A in Step 2 above) - Recommended for local development
2. Use Vercel's local development with `vercel dev` (it will use your production database)
3. Set up a new local Postgres instance if you don't have one

**Note:** Make sure `.env.local` is in your `.gitignore` file to avoid committing database credentials!

## Next Steps

- ✅ Database is set up
- ✅ API routes use the database
- ✅ Data persists across deployments
- 🎉 Your app is production-ready!

## Optional: Seed Initial Data

If you want to add the default sample songs to the database, you can create a seed script or manually add them through the UI after deployment.

