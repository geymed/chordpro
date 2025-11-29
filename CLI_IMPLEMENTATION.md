# CLI Tool Implementation Summary

## Overview

The CLI tool has been successfully implemented according to the recommended hybrid local + cloud architecture. This allows you to analyze chord sheets locally using Ollama (avoiding API token limits) and upload them to your online library.

## What Was Implemented

### 1. CLI Directory Structure

```
cli/
├── src/
│   ├── commands/
│   │   ├── analyze.ts      # Analyze URL/image/text
│   │   ├── validate.ts     # Validate files
│   │   ├── upload.ts       # Upload single file
│   │   └── bulk.ts         # Bulk operations
│   ├── lib/
│   │   ├── ollama-client.ts    # Ollama integration
│   │   ├── file-handler.ts     # File I/O
│   │   ├── api-client.ts       # API client
│   │   └── chord-sheet-format.ts  # File format spec
│   └── index.ts            # Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

### 2. Core Features

#### File Format Specification (`cli/src/lib/chord-sheet-format.ts`)
- Defines `ChordSheetFile` interface with version and metadata
- Validation function for file structure
- File creation helper

#### Ollama Client (`cli/src/lib/ollama-client.ts`)
- Connects to local Ollama instance
- Health check functionality
- Model listing
- Chord sheet analysis using Ollama models
- JSON response parsing

#### File Handler (`cli/src/lib/file-handler.ts`)
- Read/write chord sheet files
- Directory reading
- File validation

#### API Client (`cli/src/lib/api-client.ts`)
- Single file upload
- Bulk ZIP upload
- API health checks

### 3. CLI Commands

#### `analyze`
Analyzes chord sheets from various sources:
```bash
chordpro analyze --url "..." --output song.json
chordpro analyze --image song.png --output song.json
chordpro analyze --text song.txt --output song.json
```

#### `validate`
Validates chord sheet files:
```bash
chordpro validate song.json
chordpro validate song.json --verbose
```

#### `upload`
Uploads files to the online library:
```bash
chordpro upload --file song.json --api-url http://localhost:3000
```

#### `bulk`
Bulk operations:
```bash
chordpro bulk create-zip ./songs/ --output songs.zip
chordpro bulk upload-zip songs.zip --api-url http://localhost:3000
chordpro bulk validate-dir ./songs/
```

### 4. API Endpoints

#### Bulk Upload Endpoint (`app/api/sheets/upload/bulk/route.ts`)
- Accepts ZIP files via multipart/form-data
- Extracts JSON files from ZIP
- Validates and creates sheets in database
- Returns upload results with success/failure counts

## Next Steps

### 1. Install Dependencies

```bash
# Install main project dependencies (including adm-zip)
yarn install

# Install CLI dependencies
cd cli
yarn install
```

### 2. Build the CLI

```bash
cd cli
npm run build
```

### 3. Set Up Ollama

```bash
# Install Ollama
brew install ollama  # macOS
# or download from ollama.ai

# Start Ollama
ollama serve

# Pull a model
ollama pull llama3.1:8b
```

### 4. Test the CLI

```bash
# Test analyze command
cd cli
npm run dev analyze --url "https://..." --output test.json

# Test validate
npm run dev validate test.json

# Test upload (make sure Next.js server is running)
npm run dev upload --file test.json --api-url http://localhost:3000
```

## Integration with Existing Code

The CLI reuses:
- `types.ts` - Type definitions (imported via relative path)
- Database functions (`lib/db.ts`) - via API calls
- Chord utilities (`lib/chord-utils.ts`) - can be copied if needed for local validation

## File Format

Chord sheet files use this structure:

```json
{
  "version": "1.0",
  "metadata": {
    "source": "url",
    "sourceUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "sheet": {
    "id": "sheet-123",
    "title": "Song Title",
    "artist": "Artist Name",
    "language": "en",
    "key": "C",
    "tempo": "120 BPM",
    "capo": 0,
    "sections": [
      {
        "id": "section-1",
        "type": "verse",
        "label": "Verse 1",
        "lines": [
          {
            "chords": ["C", "Am", "F", "G"],
            "lyrics": "Line of lyrics here"
          }
        ]
      }
    ],
    "dateAdded": "2024-01-01"
  }
}
```

## Notes

1. **Ollama Integration**: The Ollama client is a basic implementation. You may need to enhance it based on your specific analysis needs and the quality of Ollama's output.

2. **Error Handling**: All commands include error handling and user-friendly error messages.

3. **Type Safety**: The CLI uses TypeScript for type safety and shares types with the main application.

4. **Future Enhancements**:
   - Add support for image analysis (requires OCR or vision model)
   - Improve Ollama prompt engineering for better chord extraction
   - Add progress bars for bulk operations
   - Add retry logic for failed uploads
   - Support for different file formats (ChordPro, etc.)

## Troubleshooting

### CLI can't find types.ts
The CLI uses relative imports (`../../../types`). Make sure you're running commands from the CLI directory or adjust paths accordingly.

### Ollama connection errors
- Make sure Ollama is running: `ollama serve`
- Check OLLAMA_URL environment variable
- Verify Ollama is accessible: `curl http://localhost:11434/api/tags`

### API connection errors
- Make sure Next.js server is running: `npm run dev`
- Check the API URL is correct
- Verify CORS settings if uploading to a different domain

