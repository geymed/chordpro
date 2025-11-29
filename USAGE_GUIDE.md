# ChordPro CLI Usage Guide

## Quick Start

This guide will walk you through using the CLI tool to analyze chord sheets locally and upload them to your online library.

---

## Step 1: Install Dependencies

### Install Main Project Dependencies

```bash
# From the project root
yarn install
```

This installs `adm-zip` and other dependencies needed for the bulk upload API.

### Install CLI Dependencies

```bash
cd cli

# If yarn fails with workspace error, create empty yarn.lock first:
touch yarn.lock

# Then install
yarn install
```

**Note**: If you get a workspace error, the CLI directory needs to be treated as a separate project. The `touch yarn.lock` command creates an empty lock file to make it independent.

Alternatively, you can use npm instead:
```bash
cd cli
npm install
```

This installs:
- `commander` - CLI framework
- `axios` - HTTP client
- `archiver` - ZIP file creation
- `form-data` - File uploads

---

## Step 2: Build the CLI

```bash
cd cli
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

**Note**: You can also run in development mode without building:
```bash
npm run dev <command>
```

---

## Step 3: Set Up Ollama (Local LLM)

### Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from [ollama.ai](https://ollama.ai)

### Start Ollama Server

```bash
ollama serve
```

Keep this terminal open. Ollama will run on `http://localhost:11434`.

### Pull a Model

```bash
# Recommended: llama3.1:8b (good balance of quality and speed)
ollama pull llama3.1:8b

# Alternative models you can try:
ollama pull mistral:7b        # Fast and efficient
ollama pull llama3.1:70b       # Higher quality, slower
ollama pull codellama:7b      # Good for structured data
```

### Verify Ollama is Working

```bash
ollama run llama3.1:8b "What is a chord?"
```

If you get a response, Ollama is working correctly.

---

## Step 4: Start Your Next.js Server

In a **separate terminal**, start your web application:

```bash
# From project root
npm run dev
```

The server will run on `http://localhost:3000`.

---

## Step 5: Using the CLI Commands

### Command 1: Analyze a Chord Sheet

Analyze a chord sheet from a URL, image, or text file:

```bash
cd cli

# Analyze from URL
npm run dev analyze --url "https://tabs.ultimate-guitar.com/tab/artist/song-12345" --output song.json

# Analyze from text file
npm run dev analyze --text ../song.txt --output song.json

# Analyze from image (requires vision model)
npm run dev analyze --image ../song.png --output song.json --model llama3.1:8b

# Use a different model
npm run dev analyze --url "https://..." --model mistral:7b --output song.json
```

**What happens:**
1. CLI connects to Ollama
2. Sends the chord sheet content to Ollama
3. Ollama extracts structured data (title, artist, chords, lyrics)
4. Saves result to a JSON file

**Example output:**
```
Checking Ollama connection...
📝 Analyzing chord sheet with model: llama3.1:8b...
✅ Analysis complete!
   Title: Song Title
   Artist: Artist Name
   Sections: 3
💾 Saved to: song.json
```

---

### Command 2: Validate a File

Check if a chord sheet file is valid:

```bash
cd cli

# Basic validation
npm run dev validate song.json

# Verbose output (shows details)
npm run dev validate song.json --verbose
```

**Example output:**
```
✅ File is valid!
   Title: Song Title
   Artist: Artist Name
   Language: en
   Sections: 3
   Key: C
   Tempo: 120 BPM
   Capo: 0
```

If the file is invalid, you'll see specific error messages.

---

### Command 3: Upload a Single File

Upload a chord sheet to your online library:

```bash
cd cli

# Upload to local server
npm run dev upload --file song.json --api-url http://localhost:3000

# Upload to production server
npm run dev upload --file song.json --api-url https://your-app.vercel.app
```

**What happens:**
1. CLI reads the JSON file
2. Validates the structure
3. Sends it to your API
4. API saves it to the database

**Example output:**
```
📤 Uploading to: http://localhost:3000...
📄 Reading file: song.json...
✅ Upload successful!
   Sheet ID: sheet-1234567890-abc123
```

---

### Command 4: Bulk Operations

#### Create a ZIP from Multiple Files

If you have a directory with multiple JSON files:

```bash
cd cli

# Create ZIP from directory
npm run dev bulk create-zip ../songs/ --output songs.zip

# Or use the alias
npm run dev bulk zip ../songs/ --output songs.zip
```

**What happens:**
- Finds all `.json` files in the directory
- Packages them into a ZIP file
- Ready for bulk upload

**Example output:**
```
📦 Creating ZIP from: ../songs/...
✅ Created ZIP: songs.zip
   Files included: 25
```

#### Upload a ZIP File

Upload multiple files at once:

```bash
cd cli

# Upload ZIP to local server
npm run dev bulk upload-zip songs.zip --api-url http://localhost:3000

# Upload to production
npm run dev bulk upload-zip songs.zip --api-url https://your-app.vercel.app
```

**Example output:**
```
📤 Uploading ZIP to: http://localhost:3000...
✅ Bulk upload successful!
   Uploaded: 25 files
   Failed: 0 files
```

If some files fail, you'll see details:
```
✅ Bulk upload successful!
   Uploaded: 23 files
   Failed: 2 files

   Errors:
     - song1.json: Invalid file structure: missing "sheet" property
     - song2.json: Unsupported file version: 2.0
```

#### Validate All Files in a Directory

Check all files before uploading:

```bash
cd cli

npm run dev bulk validate-dir ../songs/
```

**Example output:**
```
🔍 Validating files in: ../songs/...
✅ Validated 25 files

   Files:
     - Song 1 by Artist 1
     - Song 2 by Artist 2
     ...
```

---

## Complete Workflow Example

Here's a typical workflow:

### 1. Analyze a Song from URL

```bash
cd cli
npm run dev analyze --url "https://tabs.ultimate-guitar.com/tab/..." --output my-song.json
```

### 2. Review the Generated File

```bash
# Open the file to check if it looks correct
cat my-song.json
```

### 3. Validate the File

```bash
npm run dev validate my-song.json --verbose
```

### 4. Upload to Your Library

```bash
npm run dev upload --file my-song.json --api-url http://localhost:3000
```

### 5. Check in Browser

Open `http://localhost:3000` and verify the song appears in your library!

---

## Processing Multiple Songs

### Option 1: One by One

```bash
# Analyze each song
npm run dev analyze --url "https://..." --output song1.json
npm run dev analyze --url "https://..." --output song2.json
npm run dev analyze --url "https://..." --output song3.json

# Upload each
npm run dev upload --file song1.json --api-url http://localhost:3000
npm run dev upload --file song2.json --api-url http://localhost:3000
npm run dev upload --file song3.json --api-url http://localhost:3000
```

### Option 2: Bulk Processing

```bash
# Create a directory for your songs
mkdir songs

# Analyze multiple songs (save to songs directory)
npm run dev analyze --url "https://..." --output songs/song1.json
npm run dev analyze --url "https://..." --output songs/song2.json
npm run dev analyze --url "https://..." --output songs/song3.json

# Validate all files
npm run dev bulk validate-dir songs/

# Create ZIP
npm run dev bulk create-zip songs/ --output all-songs.zip

# Upload everything at once
npm run dev bulk upload-zip all-songs.zip --api-url http://localhost:3000
```

---

## Environment Variables

You can customize Ollama URL:

```bash
# Use a remote Ollama instance
export OLLAMA_URL=http://192.168.1.100:11434
npm run dev analyze --url "https://..." --output song.json
```

---

## Troubleshooting

### Problem: Yarn install fails in CLI directory

**Error**: "The nearest package directory doesn't seem to be part of the project"

**Solution:**
```bash
cd cli
touch yarn.lock
yarn install
```

Or use npm instead:
```bash
cd cli
npm install
```

### Problem: "Cannot connect to Ollama"

**Solution:**
1. Make sure Ollama is running: `ollama serve`
2. Check if it's accessible: `curl http://localhost:11434/api/tags`
3. Verify the URL: `echo $OLLAMA_URL` (should be `http://localhost:11434`)

### Problem: "Cannot connect to API"

**Solution:**
1. Make sure Next.js server is running: `npm run dev` (in project root)
2. Check the URL: `curl http://localhost:3000/api/sheets`
3. Verify the API URL in your command

### Problem: "Model not found"

**Solution:**
```bash
# List available models
ollama list

# Pull the model you need
ollama pull llama3.1:8b
```

### Problem: "Invalid file structure"

**Solution:**
- Make sure the file follows the correct format (see `CLI_IMPLEMENTATION.md`)
- Check that `version: "1.0"` is present
- Verify `sheet` property exists

### Problem: Analysis Quality is Poor

**Solution:**
1. Try a different model: `--model mistral:7b` or `--model llama3.1:70b`
2. Ensure the input (URL/text/image) is clear and readable
3. Check Ollama logs for errors: `ollama logs`

---

## Tips & Best Practices

1. **Start Small**: Test with 1-2 songs before processing many
2. **Validate First**: Always validate files before uploading
3. **Check Output**: Review generated JSON files before bulk uploads
4. **Use Verbose**: Use `--verbose` flag to see detailed information
5. **Keep Ollama Running**: Don't close the terminal running `ollama serve`
6. **Monitor Resources**: Large models (70b) need more RAM/CPU

---

## File Format Reference

Your chord sheet files should look like this:

```json
{
  "version": "1.0",
  "metadata": {
    "source": "url",
    "sourceUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "sheet": {
    "id": "sheet-1234567890-abc123",
    "title": "Song Title",
    "titleEn": "English Title",
    "artist": "Artist Name",
    "artistEn": "English Artist",
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

---

## Next Steps

1. **Process Your First Song**: Follow the complete workflow example above
2. **Build Up Your Library**: Analyze and upload multiple songs
3. **Customize**: Adjust Ollama prompts if needed (in `cli/src/lib/ollama-client.ts`)
4. **Automate**: Create scripts to process many URLs at once

---

## Getting Help

- Check `CLI_IMPLEMENTATION.md` for technical details
- Check `cli/README.md` for command reference
- Review error messages - they're designed to be helpful!

Happy chord sheet processing! 🎸

