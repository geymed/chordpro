# Recommended Solution: Hybrid Local + Cloud Architecture

## Why This Solution?

### Your Goals ✅
- ✅ Searchable online library
- ✅ Avoid API token limits
- ✅ Process songs locally
- ✅ Upload single or bulk files
- ✅ Cost-effective at scale

### Why Hybrid Works Best

1. **Token Limits Solved**: Local LLM = unlimited processing
2. **Cost Control**: No per-song API costs, only hosting (~$5-20/month)
3. **Offline Capability**: Process songs without internet
4. **Code Reuse**: Share TypeScript code between CLI and web app
5. **Scalability**: Can handle thousands of songs efficiently

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL ENVIRONMENT                         │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  CLI Tool    │───▶│  Ollama     │───▶│  JSON Files │  │
│  │  (Node.js)   │    │  (Local LLM)│    │  (Standard) │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                                    │
│         │ Upload (single or ZIP)                            │
│         ▼                                                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  ONLINE LIBRARY                              │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Next.js API │───▶│  PostgreSQL  │───▶│  Full-Text   │  │
│  │  (Upload)    │    │  (Storage)   │    │  Search      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
│  ┌──────────────┐                                          │
│  │  Web UI      │                                          │
│  │  (Search)    │                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

#### 1.1 Standardize File Format
**File**: `lib/chord-sheet-format.ts`
- Define TypeScript interfaces
- Add validation functions
- Version the format (v1.0)

**Actions**:
- ✅ You already have Chord type - perfect!
- Create `ChordSheetFile` interface matching your current structure
- Add `validateChordSheetFile()` function
- Add version field to files

#### 1.2 Create CLI Tool Structure
**New Package**: `packages/cli/` or `cli/` directory

```
cli/
├── src/
│   ├── commands/
│   │   ├── analyze.ts      # Analyze URL/image
│   │   ├── validate.ts     # Validate file
│   │   ├── upload.ts       # Upload to API
│   │   └── bulk.ts         # Bulk operations
│   ├── lib/
│   │   ├── ollama-client.ts    # Ollama integration
│   │   ├── file-handler.ts     # File I/O
│   │   └── api-client.ts       # API client
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key Dependencies**:
```json
{
  "dependencies": {
    "commander": "^11.0.0",
    "axios": "^1.6.0",
    "archiver": "^6.0.0"  // For ZIP creation
  }
}
```

#### 1.3 Integrate Ollama
**File**: `cli/src/lib/ollama-client.ts`

```typescript
import axios from 'axios';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export async function analyzeWithOllama(prompt: string, model = 'llama3.1:8b') {
  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model,
    prompt,
    stream: false,
    format: 'json'
  });
  
  return JSON.parse(response.data.response);
}
```

**Setup**:
```bash
# Install Ollama
brew install ollama  # macOS
# or download from ollama.ai

# Pull model
ollama pull llama3.1:8b

# Test
ollama run llama3.1:8b "What is a chord?"
```

---

### Phase 2: Core Features (Week 3-4)

#### 2.1 CLI Analyze Command
**File**: `cli/src/commands/analyze.ts`

```typescript
import { Command } from 'commander';
import { analyzeChordSheet } from '../../lib/ollama-client';
import { validateChordSheetFile, writeChordSheetFile } from '../../lib/file-handler';

export function analyzeCommand() {
  return new Command('analyze')
    .description('Analyze a chord sheet from URL or image')
    .option('-u, --url <url>', 'URL to analyze')
    .option('-i, --image <path>', 'Image file path')
    .option('-o, --output <path>', 'Output file path', 'song.json')
    .option('-m, --model <model>', 'Ollama model', 'llama3.1:8b')
    .action(async (options) => {
      // Reuse your existing analyzeChordSheet logic
      // But call Ollama instead of Gemini
      const sheet = await analyzeChordSheet(options);
      
      // Validate
      const validated = validateChordSheetFile(sheet);
      
      // Write file
      writeChordSheetFile(options.output, validated);
      
      console.log(`✅ Created ${options.output}`);
    });
}
```

#### 2.2 Bulk Upload API
**File**: `app/api/sheets/upload/bulk/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSheet } from '@/lib/db';
import AdmZip from 'adm-zip';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const zipFile = formData.get('zip') as File;
    
    if (!zipFile) {
      return NextResponse.json({ error: 'No ZIP file provided' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await zipFile.arrayBuffer());
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    
    const results = [];
    const errors = [];
    
    for (const entry of entries) {
      if (entry.entryName.endsWith('.json')) {
        try {
          const content = entry.getData().toString('utf8');
          const sheet = JSON.parse(content);
          
          // Validate and create
          await createSheet(sheet);
          results.push(entry.entryName);
        } catch (error) {
          errors.push({ file: entry.entryName, error: error.message });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      uploaded: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### Phase 3: Search & Polish (Week 5-6)

#### 3.1 Full-Text Search
**File**: `lib/db.ts` - Add search function

```typescript
export async function searchSheets(query: string, filters?: {
  language?: 'he' | 'en';
  key?: string;
  chord?: string;
}) {
  // PostgreSQL full-text search
  const { rows } = await sql`
    SELECT *, 
           ts_rank_cd(
             to_tsvector('english', title || ' ' || artist || ' ' || 
               (SELECT string_agg(lyrics, ' ') FROM jsonb_array_elements(sections) s, 
                jsonb_array_elements(s->'lines') l)),
             plainto_tsquery('english', ${query})
           ) as rank
    FROM sheets
    WHERE 
      to_tsvector('english', title || ' ' || artist) @@ plainto_tsquery('english', ${query})
      ${filters?.language ? sql`AND language = ${filters.language}` : sql``}
      ${filters?.key ? sql`AND key = ${filters.key}` : sql``}
    ORDER BY rank DESC
    LIMIT 50
  `;
  
  return rows.map(rowToSheet);
}
```

#### 3.2 Chord-Based Search
```typescript
export async function searchByChord(chord: string) {
  // Search for songs containing a specific chord
  const chordStr = typeof chord === 'string' ? chord : chordToString(chord);
  
  const { rows } = await sql`
    SELECT *
    FROM sheets
    WHERE sections::text LIKE ${`%${chordStr}%`}
    ORDER BY date_added DESC
  `;
  
  return rows.map(rowToSheet);
}
```

---

## File Format Specification

### Current Structure (Already Good!)
Your existing `ChordSheet` type is perfect. Just add:

```typescript
interface ChordSheetFile {
  version: '1.0';
  metadata: {
    source?: string;
    sourceUrl?: string;
    createdAt: string;
    updatedAt?: string;
  };
  // ... rest of your ChordSheet
}
```

### Validation
```typescript
export function validateChordSheetFile(file: any): ChordSheet {
  // Validate version
  if (file.version !== '1.0') {
    throw new Error(`Unsupported file version: ${file.version}`);
  }
  
  // Validate structure
  if (!file.sections || !Array.isArray(file.sections)) {
    throw new Error('Invalid file structure: missing sections');
  }
  
  // Validate chords
  // ... use your existing validateAndFixChordSheet
  
  return file;
}
```

---

## CLI Tool Commands

### Basic Usage
```bash
# Install CLI globally
npm install -g ./cli

# Analyze a URL
chordpro analyze --url "https://tabs.ultimate-guitar.com/..." --output song.json

# Analyze an image
chordpro analyze --image song.png --output song.json

# Validate a file
chordpro validate --file song.json

# Upload single file
chordpro upload --file song.json --api-url https://your-app.com

# Create ZIP from directory
chordpro bulk --input ./songs/ --output songs.zip

# Upload ZIP
chordpro upload --bulk songs.zip --api-url https://your-app.com
```

---

## Why This Beats Other Options

### vs Cloud-Only (Gemini API)
- ❌ **Token Limits**: Gemini has limits, Ollama doesn't
- ❌ **Costs**: $0.10-1.00 per 1000 songs vs $0
- ❌ **Rate Limits**: API throttling vs unlimited local processing
- ✅ **Winner**: Hybrid

### vs Pure Local (No Cloud)
- ❌ **No Search**: Can't search across devices
- ❌ **No Sharing**: Can't access from anywhere
- ❌ **No Backup**: Files only on one machine
- ✅ **Winner**: Hybrid

### vs Complex Architecture (Kafka, Microservices)
- ❌ **Overkill**: Too complex for your needs
- ❌ **Maintenance**: More moving parts
- ❌ **Cost**: More infrastructure
- ✅ **Winner**: Simple Hybrid

---

## Cost Breakdown

### Local Processing
- **Ollama**: Free (open source)
- **Electricity**: Negligible (~$1/month if running 24/7)
- **Storage**: Free (local disk)

### Cloud Hosting
- **Vercel**: Free tier (hobby) or $20/month (pro)
- **PostgreSQL**: 
  - Vercel Postgres: Free tier (256MB) or $20/month (1GB)
  - Supabase: Free tier (500MB) or $25/month (8GB)
  - Railway: ~$5/month (1GB)

### Total Monthly Cost
- **Free Tier**: $0/month (up to ~1000 songs)
- **Paid Tier**: $5-25/month (unlimited songs)

**vs Gemini API**: 
- 1000 songs = $0.10-1.00
- 10,000 songs = $1-10
- **Your solution**: $5-25/month flat rate ✅

---

## Migration Path

### Step 1: Export Current Songs
```typescript
// Script to export existing songs
const sheets = await getAllSheets();
for (const sheet of sheets) {
  const file = {
    version: '1.0',
    metadata: {
      createdAt: sheet.dateAdded,
      source: 'existing-library'
    },
    ...sheet
  };
  
  await writeFile(`exports/${sheet.id}.json`, JSON.stringify(file, null, 2));
}
```

### Step 2: Set Up CLI Tool
- Create CLI package
- Integrate Ollama
- Test with sample songs

### Step 3: Add Bulk Upload
- Implement ZIP upload API
- Test with exported songs

### Step 4: Enhance Search
- Add full-text search indexes
- Add chord search
- Test performance

---

## Quick Start Guide

### 1. Install Ollama
```bash
# macOS
brew install ollama

# Or download from ollama.ai
```

### 2. Pull Model
```bash
ollama pull llama3.1:8b
```

### 3. Test Ollama
```bash
ollama run llama3.1:8b "Parse this chord sheet: [ch]Fmaj7[/ch] [ch]Am[/ch]"
```

### 4. Create CLI Tool
```bash
mkdir cli
cd cli
npm init -y
npm install commander axios
# Copy your existing lib files
```

### 5. Test End-to-End
```bash
# Analyze locally
cli analyze --url "https://..." --output test.json

# Upload
cli upload --file test.json --api-url http://localhost:3000
```

---

## Success Metrics

### Phase 1 Success
- ✅ Can analyze songs locally
- ✅ Creates valid JSON files
- ✅ Files upload successfully

### Phase 2 Success
- ✅ Can process 100+ songs in batch
- ✅ Upload time < 1 minute for 100 songs
- ✅ No errors in processing

### Phase 3 Success
- ✅ Search returns results in < 100ms
- ✅ Can search by chord
- ✅ Can filter by language/key

---

## Risks & Mitigations

### Risk 1: Ollama Model Quality
**Mitigation**: 
- Test multiple models (llama3.1, mistral, codellama)
- Fallback to Gemini API if needed
- Use your existing heuristic extraction as backup

### Risk 2: Local Setup Complexity
**Mitigation**:
- Provide Docker setup
- Create installation script
- Document troubleshooting

### Risk 3: File Format Changes
**Mitigation**:
- Version the format
- Migration scripts
- Backward compatibility

---

## Next Immediate Steps

1. **This Week**: 
   - Set up Ollama locally
   - Test with 5-10 sample songs
   - Verify quality vs Gemini

2. **Next Week**:
   - Create CLI tool structure
   - Implement analyze command
   - Test file creation

3. **Week 3**:
   - Add bulk upload API
   - Test with 100+ songs
   - Measure performance

4. **Week 4**:
   - Implement search
   - Add filters
   - Polish UX

---

## Conclusion

**The Hybrid Local + Cloud architecture is the best solution because:**

1. ✅ **Solves your main problem**: No token limits
2. ✅ **Cost-effective**: Flat monthly cost vs per-song API costs
3. ✅ **Scalable**: Can handle thousands of songs
4. ✅ **Flexible**: Works offline, can process anywhere
5. ✅ **Reuses code**: Share TypeScript between CLI and web
6. ✅ **Future-proof**: Easy to add features later

**Start simple, scale as needed!**




