# ChordVault 🎸

A modern, web-based chord sheet manager and viewer. Import songs from images using OCR, edit them with a built-in editor, and manage your personal cloud library.

## Features

-   **Image OCR Import**: Upload chord sheet images and extract text using Tesseract.js (supports English and Hebrew)
-   **Interactive Editor**: Edit and fix OCR results with a visual chord sheet editor
-   **Cloud Library**: A searchable, cloud-hosted library for all your songs
-   **Smart Viewer**: Auto-scrolling, key transposition, and responsive design
-   **Bulk Upload**: Upload multiple songs via JSON files or ZIP archives

## Architecture

A single Next.js application that can run locally or be deployed:

-   **Image Upload & OCR**: Upload images, extract text with OCR, edit in the browser
-   **Library Management**: Browse, search, and view your chord sheets
-   **JSON Upload**: Import pre-formatted chord sheets via JSON or ZIP files

## Getting Started

### Prerequisites

1.  **Node.js** (v18+)
2.  **PostgreSQL** (for production, optional for local development)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repo-url>
    cd chordpro
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    Copy `.env.example` to `.env.local` and configure:
    ```env
    # Database (Vercel Postgres or Local)
    POSTGRES_URL="postgres://..."
    ```

### Usage Guide

#### 1. Import from Image
1.  Start the app locally:
    ```bash
    npm run dev
    ```
2.  Click **"Import from Image"** on the home page
3.  Upload an image of a chord sheet (or paste from clipboard)
4.  Click **"Scan & Extract Text"** to run OCR
5.  Edit the extracted chords and lyrics in the editor
6.  Click **"Save to Library"** when done

#### 2. Upload JSON Files
1.  Click **"Upload JSON"** on the home page
2.  Drag & drop JSON files or a ZIP archive containing multiple JSON files
3.  Songs are automatically added to your library

#### 3. Browse Your Library
-   Search by title or artist
-   Filter by language (Hebrew/English)
-   Click on any song to view and play it

## Deployment

This project is optimized for **Vercel**.

1.  Push to GitHub.
2.  Import project in Vercel.
3.  Add a **Vercel Postgres** database.
4.  Deploy!

The OCR functionality works entirely in the browser using Tesseract.js, so no server-side processing is required.

## License

MIT
