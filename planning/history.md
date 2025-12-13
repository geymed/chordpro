# ChordVault Development History

## 2025-12-06: Roadmap Refocus

### User Priorities (Updated)
1. **Stable song library** - Core functionality working reliably
2. **Easy song adding** - Emphasis on words/lyrics first, then quick chord filling
3. **Image reference** - Keep original images for reference during editing
4. **Unified editing** - Same editing experience in library and upload preview

### Color Theme Updates
- Changed from brown/mahogany to grayscale with subtle warm tones
- `parchment: #f5f4f2` (off-white)
- `wood: #2a2825` (near-black)

### UI Improvements Made
- Fixed "Back to Library" button visibility
- Maximized song content area in sheet view
- Moved title/metadata outside the parchment card
- Fixed Hebrew RTL editing direction
- Changed dev server port to 5555

### Current Data Model (`types.ts`)
```typescript
ChordSheet {
  id, title, artist, language, key?, tempo?, capo?
  sections: Section[]
  imagePath?: string  // For reference image
  dateAdded
}

Section { id, label, lines: ChordLine[] }
ChordLine { words: ChordWord[] }
ChordWord { word: string, chord?: string }
```

## Previous Sessions

### Image-Based OCR Pipeline
- Implemented Tesseract.js for client-side OCR
- Grid reconstruction for monospaced layouts
- Hebrew/RTL support

### Core Features Built
- Library page with search/filter
- Song view with auto-scroll
- Image upload with OCR
- JSON upload for batch import
- PostgreSQL database integration
