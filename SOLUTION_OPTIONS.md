# Chord Library Solution Options

## Overview
This document outlines different architectural approaches for building a searchable online chord library with local processing capabilities.

## Goals
- **Online Library**: Searchable, web-accessible chord sheet collection
- **Local Processing**: Use local LLM models to avoid API token limits and costs
- **File Format**: Standardized format for chord sheets
- **Bulk Operations**: Support for uploading multiple songs at once
- **Search**: Fast, accurate search across songs, artists, chords, etc.

---

## Architecture Options

### Option 1: Hybrid Local + Cloud Architecture (Recommended)

#### Architecture
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Local Tool     │         │  Online Library  │         │  Search Engine  │
│  (CLI/Desktop)  │────────▶│  (Next.js + DB)  │────────▶│  (PostgreSQL    │
│                 │         │                  │         │   Full-Text)     │
│ - Local LLM     │         │ - File Storage   │         │                 │
│ - File Creator  │         │ - User Auth      │         │ - Song Search   │
│ - Bulk Upload   │         │ - API Endpoints  │         │ - Chord Search  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

#### Components

**1. Local Tool (CLI/Desktop App)**
- **Technology**: Node.js CLI or Electron app
- **LLM**: Local model (Ollama, LM Studio, or similar)
  - Models: Llama 3.1, Mistral, or specialized music model
  - No API costs, no token limits
  - Works offline
- **Features**:
  - Extract chords from URLs/images
  - Parse and validate chord sheets
  - Create standardized files
  - Batch processing
  - Preview before upload

**2. File Format**
```json
{
  "version": "1.0",
  "metadata": {
    "title": "Song Title",
    "titleEn": "Song Title (English)",
    "artist": "Artist Name",
    "artistEn": "Artist Name (English)",
    "language": "he|en",
    "key": "Am",
    "tempo": "Moderate",
    "capo": 0,
    "source": "ultimate-guitar.com",
    "sourceUrl": "https://...",
    "createdAt": "2025-01-11T10:00:00Z",
    "createdBy": "user@example.com"
  },
  "sections": [
    {
      "id": "sec-1",
      "type": "verse",
      "label": "Verse 1",
      "lines": [
        {
          "chords": [
            {"note": "F", "accidental": null, "quality": "major", "extension": 7, "explicitMaj": true, ...},
            {"note": "A", "accidental": null, "quality": "minor", ...},
            ...
          ],
          "lyrics": "Lyrics line here"
        }
      ]
    }
  ]
}
```

**3. Online Library**
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with full-text search
- **Storage**: 
  - Option A: Store files in database (JSONB) - simpler, good for <10K songs
  - Option B: Store files in S3/Object Storage + metadata in DB - scalable
- **Features**:
  - REST API for uploads (single + bulk)
  - Search API (songs, artists, chords)
  - User authentication
  - File validation
  - Import/export

**4. Search Capabilities**
- **Full-text search**: Song titles, artists, lyrics
- **Chord search**: Find songs containing specific chords
- **Metadata search**: Key, tempo, language
- **Fuzzy search**: Handle typos, variations

#### Pros
- ✅ No API costs for processing
- ✅ No token limits
- ✅ Works offline
- ✅ Scalable architecture
- ✅ Clear separation of concerns
- ✅ Can process large batches locally

#### Cons
- ❌ Requires local setup
- ❌ Need to manage local LLM models
- ❌ Two separate codebases to maintain

---

### Option 2: Cloud-Only with Optimized API Usage

#### Architecture
```
┌─────────────────┐         ┌──────────────────┐
│  Web App        │         │  Cloud Service   │
│  (Next.js)      │────────▶│                  │
│                 │         │ - Gemini API     │
│ - Upload UI     │         │ - Processing     │
│ - Search UI     │         │ - Database       │
│ - Library UI    │         │ - Storage        │
└─────────────────┘         └──────────────────┘
```

#### Approach
- Use Gemini API but optimize:
  - **Chunking**: Break large sheets into smaller parts
  - **Caching**: Cache common chord patterns
  - **Heuristic First**: Use regex/heuristics, fallback to LLM only when needed
  - **Batch API**: Process multiple songs in one API call
  - **Rate Limiting**: Queue requests to stay within limits

#### Pros
- ✅ Single codebase
- ✅ No local setup required
- ✅ Always up-to-date models
- ✅ Simpler deployment

#### Cons
- ❌ API costs scale with usage
- ❌ Token limits still apply
- ❌ Requires internet connection
- ❌ Rate limiting complexity

---

### Option 3: Hybrid with Edge Processing

#### Architecture
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Local Tool      │         │  Edge Functions   │         │  Cloud Storage  │
│  (Optional)      │         │  (Vercel/Cloudflare)│       │  + Database     │
│                  │         │                  │         │                 │
│ - For bulk      │         │ - Light processing│         │ - File storage  │
│ - For offline   │         │ - Validation      │         │ - Search index  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

#### Approach
- Use edge functions for lightweight processing
- Heavy processing (LLM) happens locally or via API
- Files stored in cloud storage
- Database for metadata and search

#### Pros
- ✅ Fast edge processing
- ✅ Global distribution
- ✅ Can combine with local tool

#### Cons
- ❌ Edge function limitations
- ❌ More complex architecture
- ❌ Still need API for LLM

---

## File Format Options

### Option A: JSON (Current)
**Pros**: 
- Easy to parse
- Human-readable
- Flexible schema
- Works well with TypeScript

**Cons**:
- Verbose
- Larger file size
- No standard format

### Option B: ChordPro Format
**Pros**:
- Industry standard
- Compact text format
- Widely supported
- Human-readable

**Example**:
```
{title: Song Title}
{artist: Artist Name}
{key: Am}

[Verse 1]
Fmaj7    Am      G#dim
Lyrics   line    here
```

**Cons**:
- Less structured
- Harder to parse programmatically
- Limited metadata support

### Option C: YAML
**Pros**:
- Human-readable
- More compact than JSON
- Good for metadata

**Cons**:
- Less common for music
- Parsing overhead

### Recommendation: **JSON with ChordPro export option**
- Use JSON internally for structured data
- Export to ChordPro for compatibility
- Import from ChordPro when possible

---

## Local Tool Implementation Options

### Option 1: Node.js CLI Tool
**Technology**: Node.js + Commander.js
**Pros**:
- Fast to develop
- Cross-platform
- Easy to integrate with existing codebase
- Can reuse existing parsing logic

**Example**:
```bash
chordpro-cli analyze --url "https://..." --output song.json
chordpro-cli bulk --input songs.txt --output ./songs/
chordpro-cli upload --file song.json --api-key xxx
```

### Option 2: Electron Desktop App
**Technology**: Electron + React
**Pros**:
- GUI for non-technical users
- Drag-and-drop support
- Preview before upload
- Better UX

**Cons**:
- More complex to build
- Larger app size
- Platform-specific builds

### Option 3: Python CLI Tool
**Technology**: Python + Click/Argparse
**Pros**:
- Great ML/LLM ecosystem
- Easy Ollama integration
- Many music libraries available

**Cons**:
- Different language from main app
- Need to share parsing logic

### Recommendation: **Node.js CLI Tool**
- Reuse existing TypeScript code
- Easy to maintain
- Can add GUI later if needed

---

## Local LLM Options

### Option 1: Ollama
**Pros**:
- Easy setup (`ollama pull llama3.1`)
- Good model selection
- Simple API
- Cross-platform

**Models**:
- `llama3.1:8b` - Good balance
- `mistral:7b` - Fast, efficient
- `codellama:7b` - Good for structured output

### Option 2: LM Studio
**Pros**:
- GUI interface
- Easy model management
- Local server API
- Good for experimentation

### Option 3: Hugging Face Transformers
**Pros**:
- Most model options
- Can fine-tune
- Full control

**Cons**:
- More complex setup
- Requires ML knowledge

### Recommendation: **Ollama**
- Simplest setup
- Good enough models
- Active community

---

## Bulk Upload Strategy

### Option 1: ZIP Archive
- Package multiple JSON files in ZIP
- Upload ZIP to API
- Server extracts and processes

**Pros**: Simple, standard format
**Cons**: Need to handle large files

### Option 2: Directory Upload
- Upload entire directory
- Server processes recursively

**Pros**: Intuitive
**Cons**: Complex to implement

### Option 3: Manifest File
- Create `manifest.json` listing all files
- Upload manifest + files
- Server processes in order

**Pros**: Can include metadata, dependencies
**Cons**: More complex

### Recommendation: **ZIP Archive**
- Standard format
- Easy to implement
- Can include manifest.json inside

---

## Search Implementation

### Option 1: PostgreSQL Full-Text Search
**Pros**:
- Built-in, no extra services
- Good enough for most use cases
- Integrated with existing DB

**Cons**:
- Limited advanced features
- Performance degrades with large datasets

### Option 2: Elasticsearch/OpenSearch
**Pros**:
- Powerful search capabilities
- Handles large datasets
- Advanced querying

**Cons**:
- Additional service to maintain
- More complex setup
- Overkill for small libraries

### Option 3: Algolia/Meilisearch
**Pros**:
- Managed service (Algolia)
- Fast, typo-tolerant
- Good API

**Cons**:
- Cost (Algolia)
- External dependency

### Recommendation: **Start with PostgreSQL Full-Text, migrate to Meilisearch if needed**
- PostgreSQL FTS is good for <100K songs
- Meilisearch is open-source, self-hostable
- Easy migration path

---

## Implementation Phases

### Phase 1: File Format & Local Tool (MVP)
1. ✅ Standardize JSON file format
2. ✅ Create Node.js CLI tool
3. ✅ Integrate Ollama for local processing
4. ✅ Add file validation
5. ✅ Basic upload API

### Phase 2: Bulk Operations
1. ZIP upload support
2. Batch processing API
3. Progress tracking
4. Error handling

### Phase 3: Enhanced Search
1. Full-text search implementation
2. Chord-based search
3. Advanced filters
4. Search result ranking

### Phase 4: Advanced Features
1. User authentication
2. Collections/playlists
3. Sharing capabilities
4. Export to ChordPro
5. Import from ChordPro

---

## Recommended Solution

### Architecture: **Hybrid Local + Cloud**

**Components**:
1. **Local CLI Tool** (Node.js)
   - Uses Ollama for LLM processing
   - Creates standardized JSON files
   - Validates and previews before upload
   - Supports bulk operations

2. **File Format**: JSON (with ChordPro export)
   - Structured, validated format
   - Includes all metadata
   - Easy to parse and search

3. **Online Library** (Next.js + PostgreSQL)
   - REST API for uploads (single + bulk ZIP)
   - PostgreSQL full-text search
   - File storage in database (JSONB)
   - User authentication (optional)

4. **Search**: PostgreSQL Full-Text Search
   - Start simple, upgrade if needed
   - Index: title, artist, lyrics, chords

**Benefits**:
- ✅ No API costs for processing
- ✅ No token limits
- ✅ Works offline
- ✅ Scalable architecture
- ✅ Reuses existing codebase
- ✅ Standard file format

**Next Steps**:
1. Create `chordpro-cli` package
2. Integrate Ollama
3. Standardize file format
4. Add bulk upload API
5. Implement search

---

## Questions to Consider

1. **User Authentication**: Do you need user accounts, or public library?
2. **File Storage**: Database vs Object Storage (S3)?
3. **Search Scale**: How many songs do you expect? (<1K, 1K-10K, 10K+)
4. **Sharing**: Do you want to share songs with others?
5. **Mobile App**: Do you need a mobile app later?
6. **Offline Access**: Should the web app work offline?

---

## File Format Schema (Detailed)

```typescript
interface ChordSheetFile {
  version: string; // "1.0"
  metadata: {
    title: string;
    titleEn?: string;
    artist: string;
    artistEn?: string;
    language: 'he' | 'en';
    key?: string;
    tempo?: string;
    capo?: number;
    source?: string; // URL or source name
    sourceUrl?: string;
    tags?: string[];
    createdAt: string; // ISO 8601
    updatedAt?: string;
    createdBy?: string;
  };
  sections: Section[];
}

interface Section {
  id: string;
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro';
  label: string;
  lines: ChordLine[];
}

interface ChordLine {
  chords: (Chord | string)[]; // Support both for backward compat
  lyrics: string;
}

interface Chord {
  note: Note;
  accidental: Accidental;
  quality: ChordQuality;
  extension: Extension;
  add: number | null;
  inversion: Note | null;
  special: 'N.C.' | 'x' | null;
  explicitMaj?: boolean;
}
```

---

## CLI Tool Commands (Proposed)

```bash
# Analyze a single URL
chordpro-cli analyze --url "https://..." --output song.json

# Analyze an image
chordpro-cli analyze --image song.png --output song.json

# Analyze multiple URLs from file
chordpro-cli bulk --input urls.txt --output ./songs/

# Validate a file
chordpro-cli validate --file song.json

# Preview a file
chordpro-cli preview --file song.json

# Upload single file
chordpro-cli upload --file song.json --api-url https://your-api.com

# Upload bulk (ZIP)
chordpro-cli upload --bulk songs.zip --api-url https://your-api.com

# Export to ChordPro format
chordpro-cli export --file song.json --format chordpro --output song.pro

# Import from ChordPro
chordpro-cli import --file song.pro --output song.json
```

---

## API Endpoints (Proposed)

### Upload
```
POST /api/sheets/upload
Content-Type: multipart/form-data
Body: { file: File }

POST /api/sheets/upload/bulk
Content-Type: multipart/form-data
Body: { zip: File }
```

### Search
```
GET /api/sheets/search?q=query&type=song|artist|chord
GET /api/sheets/search?chord=Fmaj7
GET /api/sheets/search?artist=Bob+Marley
```

### Management
```
GET /api/sheets
GET /api/sheets/:id
PUT /api/sheets/:id
DELETE /api/sheets/:id
```

---

## Migration Path

1. **Current System** → **File Format**
   - Export existing songs to JSON files
   - Validate format
   - Test import

2. **Add Local Tool**
   - Create CLI tool
   - Integrate Ollama
   - Test with sample songs

3. **Add Bulk Upload**
   - Implement ZIP upload API
   - Add batch processing
   - Test with large batches

4. **Enhance Search**
   - Add full-text search indexes
   - Implement chord search
   - Add filters

5. **Polish**
   - Add user auth (if needed)
   - Add sharing features
   - Add export/import

---

## Cost Analysis

### Option 1: Hybrid (Local + Cloud)
- **Local Processing**: $0 (Ollama free)
- **Cloud Storage**: ~$5-20/month (Vercel/PostgreSQL)
- **Total**: ~$5-20/month

### Option 2: Cloud-Only (Gemini API)
- **API Costs**: ~$0.10-1.00 per 1000 songs (depends on complexity)
- **Cloud Storage**: ~$5-20/month
- **Total**: ~$5-50/month (scales with usage)

### Recommendation: **Hybrid** for cost savings at scale

---

## Next Steps

1. **Decide on architecture** (Recommend: Hybrid)
2. **Create file format spec** (JSON with validation)
3. **Build CLI tool** (Node.js + Ollama)
4. **Add bulk upload API** (ZIP support)
5. **Implement search** (PostgreSQL FTS)
6. **Test end-to-end** (Local → Upload → Search)





