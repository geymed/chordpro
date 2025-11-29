# Local Analysis UI Guide

## Overview

A web-based UI for analyzing chord sheets locally using Ollama, without relying on cloud LLM APIs. This provides unlimited analysis without token limits or API costs.

## Features

- ✅ **URL Analysis**: Analyze chord sheets from URLs
- ✅ **File Upload**: Upload text files or images
- ✅ **Text Paste**: Paste chord sheet text directly
- ✅ **Ollama Integration**: Uses local Ollama instance
- ✅ **Real-time Status**: Shows Ollama availability
- ✅ **Save to Library**: Option to save directly to your library
- ✅ **Model Selection**: Choose which Ollama model to use

## Accessing the UI

1. Start your Next.js server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/analyze`

   Or click the "🔍 Analyze Locally (Ollama)" button on the home page.

## Prerequisites

### 1. Install Ollama

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

### 2. Start Ollama Server

```bash
ollama serve
```

Keep this terminal open. Ollama runs on `http://localhost:11434`.

### 3. Pull a Model

```bash
# Recommended: llama3.1:8b
ollama pull llama3.1:8b

# Alternative models:
ollama pull mistral:7b        # Fast and efficient
ollama pull llama3.1:70b      # Higher quality, slower
```

## Using the UI

### Step 1: Check Ollama Status

When you open the page, it automatically checks if Ollama is available:
- ✅ **Green banner**: Ollama is running and ready
- ⚠️ **Red banner**: Ollama is not available (start it with `ollama serve`)

### Step 2: Choose Input Method

Select one of three methods:

1. **URL**: Paste a URL to a chord sheet page
2. **File Upload**: Upload a text file or image
3. **Paste Text**: Paste chord sheet text directly

### Step 3: Configure Options

- **Ollama Model**: Choose which model to use (default: `llama3.1:8b`)
- **Save to Library**: Check this to automatically save after analysis

### Step 4: Analyze

Click "Analyze Chord Sheet" and wait for the analysis to complete.

### Step 5: Review Results

The results show:
- Song title and artist
- Key and tempo (if detected)
- Number of sections
- Section list

You can then:
- **Save to Library**: If not auto-saved
- **View Full Sheet**: See the complete chord sheet

## Example Workflow

1. **Start Ollama**:
   ```bash
   ollama serve
   ```

2. **Start Next.js** (in another terminal):
   ```bash
   npm run dev
   ```

3. **Open Browser**: `http://localhost:3000/analyze`

4. **Analyze a Song**:
   - Select "URL" method
   - Paste: `https://tabs.ultimate-guitar.com/tab/...`
   - Click "Analyze Chord Sheet"

5. **Review & Save**:
   - Check the results
   - Click "Save to Library" if needed
   - View the full sheet

## API Endpoints

### GET `/api/analyze/local`
Check if Ollama is available.

**Response:**
```json
{
  "available": true
}
```

### POST `/api/analyze/local`
Analyze a chord sheet using Ollama.

**Form Data:**
- `url` (optional): URL to analyze
- `file` (optional): File to upload
- `text` (optional): Text content
- `model` (optional): Ollama model name
- `save` (optional): "true" to save immediately

**Response:**
```json
{
  "success": true,
  "sheet": { ... },
  "message": "Chord sheet analyzed"
}
```

## Troubleshooting

### Ollama Not Available

**Problem**: Red banner saying Ollama is not available

**Solution**:
1. Make sure Ollama is running: `ollama serve`
2. Check if it's accessible: `curl http://localhost:11434/api/tags`
3. Verify the URL in `.env.local` (if set): `OLLAMA_URL=http://localhost:11434`

### Model Not Found

**Problem**: Analysis fails with "model not found"

**Solution**:
```bash
# List available models
ollama list

# Pull the model you need
ollama pull llama3.1:8b
```

### Analysis Takes Too Long

**Problem**: Analysis is slow or times out

**Solutions**:
1. Use a smaller model: `mistral:7b` instead of `llama3.1:70b`
2. Check your system resources (RAM/CPU)
3. Ensure Ollama has enough resources allocated

### Poor Analysis Quality

**Problem**: Results are inaccurate or incomplete

**Solutions**:
1. Try a larger model: `llama3.1:70b`
2. Ensure input is clear and well-formatted
3. For URLs, make sure the page is accessible
4. For images, ensure they're clear and readable

## Environment Variables

You can customize Ollama settings in `.env.local`:

```bash
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

## Comparison: UI vs CLI

| Feature | UI | CLI |
|---------|----|-----|
| Ease of Use | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| File Upload | ✅ | ✅ |
| URL Analysis | ✅ | ✅ |
| Text Input | ✅ | ✅ |
| Bulk Processing | ❌ | ✅ |
| Automation | ❌ | ✅ |
| Integration | Web-based | Scriptable |

**Use the UI when:**
- You want a visual interface
- Analyzing one song at a time
- Prefer clicking over typing commands

**Use the CLI when:**
- Processing many songs in bulk
- Automating workflows
- Integrating with scripts

## Next Steps

1. **Try It Out**: Analyze your first song using the UI
2. **Experiment**: Try different models and input methods
3. **Compare**: See how results compare to cloud-based analysis
4. **Optimize**: Adjust prompts or models for better results

Enjoy unlimited, local chord sheet analysis! 🎸

