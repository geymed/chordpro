# Project Context & Handover

**Project:** ChordVault (ChordPro Manager with OCR)
**Date:** 2025-12-11 (Updated: 2025-01-XX)
**Main Objective:** Build a vintage-styled, intelligent chord sheet manager that supports Hebrew/RTL content and image-based import.

---

## 1. Project Overview
ChordVault is a Next.js application designed to manage musical chord sheets. Its unique value proposition is the ability to import songs from **static images** (screenshots, photos) or **Ultimate Guitar URLs**, automatically converting them into a structured, editable format while maintaining correct alignment for **Hebrew (RTL)** lyrics.

The UI follows a specific **"Vintage/Parchment" aesthetic** (pale beige backgrounds `#e8d5b7`, serif fonts like Baskerville, music-oriented typography).

## 2. Technical Stack
*   **Framework:** Next.js 14+ (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (Custom configuration for vintage colors/fonts)
*   **Database:** PostgreSQL (via @vercel/postgres)
*   **OCR/Analysis:**
    *   `tesseract.js` (Client-side OCR in browser)
    *   `lib/ocr-utils.ts` - Core OCR processing and chord-word matching
    *   Position-based alignment algorithm for accurate chord-word matching
*   **AI/Validation:**
    *   Google Gemini Vision API (`gemini-1.5-flash` / `gemini-pro-vision`) for OCR validation
    *   Rule-based chord validation (`lib/chord-validator.ts`) using `parseChord`/`chordToString`
*   **Components:**
    *   `components/ChordLine.tsx` - Reusable component for rendering chord lines with RTL support

## 3. Current State & Features

### A. Image Upload & OCR Pipeline (`app/upload/image/page.tsx`)
The primary workflow for importing songs from images:
*   **Multi-Image Support:**
    1.  User uploads/pastes one or more images
    2.  Images are displayed as tabs with previews
    3.  User can remove individual images before processing
*   **Client-Side OCR Processing:**
    1.  Uses `tesseract.js` worker in the browser
    2.  Processes each image sequentially with progress tracking
    3.  Calls `processOCRText()` from `lib/ocr-utils.ts` to extract structured data
    4.  Results are displayed in an **editable editor interface**
*   **Editor Features:**
    *   Individual words are editable with prominent styling
    *   Chords are editable above each word
    *   Buttons to add/remove words and lines
    *   Title and artist fields are editable
    *   Sections can be edited and reorganized
*   **Validation Pipeline:**
    1.  **Rule-based validation:** `validateChordSheet()` normalizes chords using `parseChord`
    2.  **LLM validation (optional):** `validateOCRWithImage()` sends image + extracted sheet to Gemini Vision API for intelligent correction
    3.  Validation results are displayed with warnings/errors
*   **Save to Database:**
    *   Validated sheets can be saved to PostgreSQL via `createSheet()` API

### B. OCR Processing Logic (`lib/ocr-utils.ts`)
Core algorithms for extracting structured chord sheets from raw OCR text:
*   **Chord Detection:** `isChordLine()` - Regex-based detection (>30% chord density)
*   **Chord Extraction:** `extractChordPositions()` - Extracts chords with character positions
*   **RTL Detection:** `isRTL()` - Detects Hebrew/Arabic characters
*   **Chord-Word Matching:** `matchChordsToWords()` - Position-based alignment algorithm:
    *   Normalizes spacing in both chord and lyric lines
    *   Calculates proportional positions (0-1) for chords and words
    *   For RTL: Reverses arrays for matching, then maps back to original indices
    *   Uses overlap and proximity scoring to find best matches
    *   Handles OCR spacing errors and misalignments
*   **Title/Artist Extraction:** `extractTitleAndArtist()` - Identifies metadata separately from lyrics
*   **Section Detection:** Handles chord-only intro sections and regular verse/chorus sections

### C. View Mode (`app/sheet/[id]/page.tsx`)
Displays saved chord sheets with vintage styling:
*   **Theme:**
    *   Background: Pale beige (`#e8d5b7`)
    *   Text: Dark gray (`#1f2937`)
    *   Chords: Blue (`text-blue-700`)
    *   Fonts: Baskerville serif for lyrics, same for chords (larger sizes)
*   **RTL Support:**
    *   Detects Hebrew per section label for alignment
    *   Title/artist alignment based on content language
    *   Uses `dir` attributes and inline styles for correct rendering
*   **Layout:**
    *   Reduced word spacing (`gap: 0.1em`)
    *   Flex-wrap to prevent overflow
    *   Larger fonts (words: `text-3xl`, chords: `text-xl`)

### D. Design System
*   **Theme:** Defined in `tailwind.config.js` and `globals.css`.
    *   Background: `bg-parchment` (#f5f4f2) - but view mode uses `#e8d5b7`
    *   Accents: `wood` (#2a2825)
    *   Fonts: Baskerville, Georgia, Palatino (serif fonts) for music-oriented feel
*   **Components:**
    *   `ChordLine` component handles both editor and view modes
    *   Per-word/per-line RTL detection for dynamic directionality
    *   Explicit inline styles for `direction`, `textAlign`, `flexDirection` to ensure correct rendering

## 4. Key Files

### Core Application
*   `app/upload/image/page.tsx`: Main image upload and OCR editor interface
*   `app/sheet/[id]/page.tsx`: Song view page with vintage styling
*   `app/page.tsx`: Library/home page listing all songs
*   `components/ChordLine.tsx`: Reusable component for rendering chord lines (editor + view modes)

### OCR & Processing
*   `lib/ocr-utils.ts`: Core OCR processing logic, chord-word matching, RTL detection
*   `lib/chord-utils.ts`: Chord parsing (`parseChord`) and string conversion (`chordToString`)
*   `lib/chord-validator.ts`: Rule-based chord validation and normalization

### API Routes
*   `app/api/validate-ocr/route.ts`: Gemini Vision API endpoint for LLM-based OCR validation
*   `app/api/sheets/route.ts`: CRUD operations for chord sheets
*   `app/api/analyze/local/route.ts`: Legacy analysis endpoint (may still exist but not primary flow)

### Database
*   `lib/db.ts`: PostgreSQL database operations (`@vercel/postgres`)
*   `lib/api.ts`: Client-side API wrapper functions

### Styling
*   `app/globals.css`: Base styles and theme
*   `tailwind.config.js`: Tailwind configuration with custom colors

## 5. Known Issues & TODOs
*   **Language Detection:** English songs can sometimes be incorrectly detected as Hebrew (e.g., "Roxanne"). The detection logic in `ocr-utils.ts` may need refinement to check actual text content more carefully.
*   **OCR Accuracy:** While position-based matching improves alignment, OCR errors in chord names still occur. The LLM validation step helps but requires API key.
*   **Multi-Image Processing:** Currently processes images sequentially. Could be parallelized for better UX.
*   **Error Handling:** Basic error handling exists, but edge cases (blurry images, low-confidence OCR) need better user feedback.
*   **Mobile Polish:** The editor and view modes should be tested on mobile devices for optimal musician use cases.

## 6. Recent Improvements (2025)
1.  **Editor Mode:** Fully functional editor with editable words and chords, add/remove functionality
2.  **Multi-Image Support:** Users can upload multiple images for long songs
3.  **LLM Validation:** Integrated Gemini Vision API for intelligent OCR correction
4.  **RTL Improvements:** Per-line/per-word Hebrew detection with correct alignment
5.  **Vintage Theme:** Light parchment background with serif fonts, larger text sizes
6.  **Chord Validation:** Rule-based validation using `parseChord` to normalize chord notation
7.  **Position-Based Matching:** Improved chord-word alignment algorithm using proportional positions

## 7. Next Steps for Development
1.  **Parser Refinement:** Continue improving `matchChordsToWords()` to handle:
    *   More edge cases in OCR spacing errors
    *   Better handling of chords between words
    *   Improved RTL matching accuracy
2.  **Language Detection:** Improve detection logic to avoid false positives for Hebrew
3.  **Performance:** Optimize multi-image processing (parallelization, caching)
4.  **Mobile Polish:** Ensure editor and view modes work seamlessly on mobile devices
5.  **Export Features:** Add ability to export chord sheets to various formats (PDF, ChordPro, etc.)
6.  **Search & Filter:** Enhance library page with search and filtering capabilities
