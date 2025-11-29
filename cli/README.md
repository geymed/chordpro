# ChordPro CLI Tool

CLI tool for analyzing chord sheets locally using Ollama and uploading them to your online library.

## Installation

### 1. Install Dependencies

```bash
cd cli
npm install
# or
yarn install
```

### 2. Build the CLI

```bash
npm run build
```

### 3. Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux/Windows:**
Download from [ollama.ai](https://ollama.ai)

### 4. Pull a Model

```bash
ollama pull llama3.1:8b
```

## Usage

### Analyze a Chord Sheet

```bash
# From URL
chordpro analyze --url "https://tabs.ultimate-guitar.com/..." --output song.json

# From image file
chordpro analyze --image song.png --output song.json

# From text file
chordpro analyze --text song.txt --output song.json

# Using a different model
chordpro analyze --url "..." --model "mistral:7b" --output song.json
```

### Validate a File

```bash
# Basic validation
chordpro validate song.json

# Verbose output
chordpro validate song.json --verbose
```

### Upload a File

```bash
# Upload to local server
chordpro upload --file song.json --api-url http://localhost:3000

# Upload to production
chordpro upload --file song.json --api-url https://your-app.com
```

### Bulk Operations

```bash
# Create ZIP from directory
chordpro bulk create-zip ./songs/ --output songs.zip

# Upload ZIP file
chordpro bulk upload-zip songs.zip --api-url http://localhost:3000

# Validate all files in directory
chordpro bulk validate-dir ./songs/
```

## Development

### Run in Development Mode

```bash
npm run dev analyze --url "..." --output song.json
```

### Build

```bash
npm run build
```

## Environment Variables

- `OLLAMA_URL`: Ollama server URL (default: `http://localhost:11434`)

## File Format

Chord sheet files follow this structure:

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
    "sections": [...]
  }
}
```

## Troubleshooting

### Cannot connect to Ollama

Make sure Ollama is running:
```bash
ollama serve
```

Check if Ollama is accessible:
```bash
curl http://localhost:11434/api/tags
```

### API Connection Issues

Make sure your Next.js server is running:
```bash
npm run dev
```

Check the API URL is correct and accessible.

