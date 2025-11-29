# ChordVault 🎸

A modern, web-based chord sheet manager and viewer. Analyze songs from the web or PDFs locally, then upload them to your personal cloud library.

## Features

-   **Local Studio**: Analyze songs from URLs (Ultimate Guitar), Text, or PDFs using a local LLM (Ollama).
-   **Remote Library**: A searchable, cloud-hosted library for all your songs.
-   **Smart Viewer**: Auto-scrolling, key transposition, and responsive design.
-   **Privacy First**: Analysis happens locally on your machine; only the final chord sheets are uploaded.

## Architecture

The app is split into two logical parts (served from the same Next.js codebase):

1.  **Local App (Development Mode)**:
    -   Runs on your machine (`npm run dev`).
    -   Access to **Local Studio** (`/studio`) for analyzing content.
    -   Connects to your local Ollama instance.
    -   **Workflow**: Analyze -> Download JSON.

2.  **Remote App (Production)**:
    -   Deployed on Vercel.
    -   **Local Studio is hidden**.
    -   Features an **Upload Page** (`/upload`) to add songs.
    -   **Workflow**: Upload JSON/ZIP -> Browse & Play.

## Getting Started

### Prerequisites

1.  **Node.js** (v18+)
2.  **Ollama** (for local analysis)
    -   Install from [ollama.com](https://ollama.com)
    -   Pull the model: `ollama pull llama3.1:8b`
3.  **PostgreSQL** (optional for local, required for remote)

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
    
    # Ollama (Local Analysis)
    OLLAMA_URL="http://localhost:11434"
    OLLAMA_MODEL="llama3.1:8b"
    ```

### Usage Guide

#### 1. Analyzing Songs (Local)
1.  Start the app locally:
    ```bash
    npm run dev
    ```
2.  Open [http://localhost:3000/studio](http://localhost:3000/studio).
3.  **Analyze**:
    -   **URL**: Paste an Ultimate Guitar link.
    -   **PDF**: Upload a songbook PDF.
    -   **Text**: Paste raw lyrics/chords.
4.  **Download**: Click the **📥 JSON** button to save the analyzed song to your computer.

#### 2. Uploading to Library (Remote)
1.  Go to your deployed app (e.g., `https://chordvault.vercel.app`).
2.  Click **Upload** in the top navigation.
3.  Drag & drop the JSON files (or a ZIP of them) you downloaded.
4.  The songs are now available in your library!

#### 3. CLI Tool
You can also use the CLI for bulk operations:
```bash
# Analyze a PDF and save to ./songs
npm run dev analyze --pdf songbook.pdf --output ./songs

# Create a ZIP for upload
npm run dev bulk zip ./songs --output upload.zip
```

## Deployment

This project is optimized for **Vercel**.

1.  Push to GitHub.
2.  Import project in Vercel.
3.  Add a **Vercel Postgres** database.
4.  Deploy!

> **Note**: The "Local Studio" feature will not work on Vercel unless you configure a remote Ollama instance. It is designed to be used locally.

## License

MIT
