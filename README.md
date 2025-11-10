# ChordVault

Your personal guitar chord sheet library.

A beautiful web app for managing and viewing guitar chord sheets with support for both Hebrew (RTL) and English (LTR) songs.

## Features

- 📚 Library view with song cards
- 🎸 Beautiful chord sheet display with chords above lyrics
- 🌍 Support for Hebrew (RTL) and English (LTR)
- 🔍 Search and filter by language
- ➕ Add and edit songs
- 🚀 Deployable to Vercel with backend API routes

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This app is ready to deploy to Vercel! See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy

1. Push to GitHub
2. Import to Vercel
3. Deploy!

The backend API routes are included and will work as serverless functions on Vercel.

**Note:** For production, you'll want to add a database (Vercel Postgres, MongoDB, Supabase, etc.) as the current implementation uses in-memory storage that resets on cold starts.

