# Project Context & Handover

**Project:** ChordVault (ChordPro Manager with OCR)
**Date:** 2025-12-11
**Main Objective:** Build a vintage-styled, intelligent chord sheet manager that supports Hebrew/RTL content and image-based import.

---

## 1. Project Overview
ChordVault is a Next.js application designed to manage musical chord sheets. Its unique value proposition is the ability to import songs from **static images** (screenshots, photos) or **Ultimate Guitar URLs**, automatically converting them into a structured, editable format while maintaining correct alignment for **Hebrew (RTL)** lyrics.

The UI follows a specific **"Vintage/Old Card" aesthetic** (parchment backgrounds, serif fonts).

## 2. Technical Stack
*   **Framework:** Next.js 14+ (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (Custom configuration for vintage colors/fonts)
*   **Database:** PostgreSQL (via @vercel/postgres)
*   **OCR/Analysis:**
    *   `tesseract.js` (Client/Server-side OCR)
    *   Custom `GridReconstructor` (Re-inflates whitespace from OCR data)
    *   Custom `ChordParser` (Text-to-JSON with Hebrew support)

## 3. Current State & Features

### A. Analysis Pipeline (`app/api/analyze/local`)
The core functionality is transforming raw inputs into structured `ChordSheet` objects.
*   **Image Input:**
    1.  Receives file upload.
    2.  Saves to `public/uploads`.
    3.  Runs `reconstructChordSheet` (likely uses Tesseract to get text + geometry, then reconstructs the 2D grid of characters).
    4.  Runs `parseGridTextToChordSheet`.
*   **URL Input:**
    1.  Detects Ultimate Guitar URLs.
    2.  Uses `scrapeUltimateGuitar` to extract data directly.
*   **Text Processing (`lib/analysis/chord-parser.ts`):**
    *   **Chord Detection:** Heuristic based on chord density (>40% of line).
    *   **RTL Support:** Explicitly reverses Hebrew words in lyric lines to handle visual-logical mismatches.
    *   **Alignment:** Tokenizes lyrics and attempts to match chords above them using character indices (merging into `ChordLine` objects).

### B. Design System
*   **Theme:** Defined in `tailwind.config.js` and `globals.css`.
    *   Background: `bg-parchment` (#f5f4f2)
    *   Accents: `wood` (#2a2825)
    *   Font: "Playfair Display" (Variable font recommended).
*   **Components:**
    *   Uses a "Card" metaphor for songs.
    *   Rounded corners, subtle shadows to mimic physical cards.

## 4. Key Files
*   `app/api/analyze/local/route.ts`: Main entry point for the analysis backend.
*   `lib/analysis/chord-parser.ts`: The "brain" that aligns chords to words. Contains Hebrew reversal logic.
*   `lib/analysis/grid-reconstructor.ts`: (Crucial) Handles the visual-to-text spatial conversion.
*   `app/globals.css`: Contains the base vintage theme classes.

## 5. Known Issues & TODOs
*   **Orphan Chords:** The current parser (`chord-parser.ts`) has a comment: `// Check for orphan chords... This is a simplified implementation`. Chords at the end of a line without words details might be lost or misaligned.
*   **Hebrew Handling:** The "Reversal" strategy is a hardcoded fix for RTL. Ensure this doesn't conflict with browsers that handle RTL natively if the rendering logic changes.
*   **Data Persistence:** The API currently returns the analyzed sheet JSON. Use cases for *saving* this to the Postgres DB need to be verified/implemented.
*   **Error Handling:** Basic error handling exists, but edge cases (blurry images, low-confidence OCR) need better user feedback.

## 6. Next Steps for Development
1.  **Smart Editor:** Build the frontend interface to *edit* the result of the analysis. OCR is rarely perfect; users need to correct chords/lyrics before saving.
2.  **Parser Refinement:** Improve `chord-parser.ts` to handle:
    *   Instrumental breaks (lines with just chords).
    *   Chords that appear *between* words (currently aligns to nearest word with margin).
3.  **Library Features:** Implement the "Save to Library" flow connecting the analyzed result to the Postgres database.
4.  **Mobile Polish:** Ensure the vintage card view scales down gracefully for phone screens (a primary use case for musicians).
