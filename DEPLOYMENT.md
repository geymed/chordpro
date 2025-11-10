# Deployment Guide for Vercel

## Yes, Vercel Supports Backend!

Vercel fully supports backend functionality through **Next.js API Routes**, which run as serverless functions. This is perfect for your chord sheet library.

## Current Setup

The app is configured with:
- ✅ Next.js API routes (`/app/api/sheets/*`)
- ✅ Vercel configuration (`vercel.json`)
- ✅ Serverless backend endpoints

## Important: Data Storage

**Current Implementation (Demo):**
- Uses in-memory storage in serverless functions
- ⚠️ **Data is lost on cold starts** (when functions haven't been used in a while)
- This is fine for development/testing, but not for production

**For Production, You Need a Database:**

### Recommended Options:

1. **Vercel Postgres** (Recommended)
   - Native Vercel integration
   - Easy to set up
   - Free tier available
   - [Docs](https://vercel.com/docs/storage/vercel-postgres)

2. **MongoDB Atlas**
   - Free tier available
   - Easy to use with Next.js
   - [Docs](https://www.mongodb.com/docs/atlas/)

3. **Supabase**
   - Free tier available
   - PostgreSQL-based
   - Great for Next.js
   - [Docs](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

4. **PlanetScale**
   - MySQL-compatible
   - Free tier available
   - [Docs](https://planetscale.com/docs)

## Deploying to Vercel

### Option 1: Via Vercel Dashboard (Easiest)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Vercel will auto-detect Next.js
6. Click "Deploy"

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# For production
vercel --prod
```

## Environment Variables

If you add a database, you'll need to set environment variables in Vercel:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add your database connection strings

## API Endpoints

Once deployed, your API will be available at:
- `https://your-app.vercel.app/api/sheets` - GET all, POST create
- `https://your-app.vercel.app/api/sheets/[id]` - GET, PUT, DELETE

## Next Steps

1. **Deploy to Vercel** (works with current in-memory storage for testing)
2. **Add a database** when ready for production
3. **Update API routes** to use the database instead of in-memory storage

## Example: Adding Vercel Postgres

```bash
# Install Vercel Postgres
npm install @vercel/postgres

# In your API route:
import { sql } from '@vercel/postgres';

export async function GET() {
  const { rows } = await sql`SELECT * FROM sheets`;
  return NextResponse.json(rows);
}
```

Then set up the database in Vercel dashboard and create the schema.

