# LLM Analysis Setup

The app uses OpenAI's GPT-4 Vision model to analyze chord sheet images and extract structured data.

## Features

✅ **URL Analysis**: Paste a link to an image of a chord sheet  
✅ **Image Upload**: Upload a chord sheet image directly  
✅ **AI Extraction**: Automatically extracts:
   - Song title (and English translation if applicable)
   - Artist name
   - Language (Hebrew/English detection)
   - Musical key, tempo, capo
   - All sections (verses, choruses, etc.)
   - Chords aligned with lyrics line by line

## Setup Instructions

### Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the API key (you'll only see it once!)

### Step 2: Add API Key to Environment Variables

#### For Local Development:

Create a `.env.local` file in the project root:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

#### For Vercel Deployment:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**

### Step 3: Redeploy (if already deployed)

After adding the environment variable, Vercel will automatically redeploy, or you can trigger a redeploy manually.

## Usage

1. Click **"+ Add New Chord Sheet"** button
2. Choose one of two options:
   - **From URL**: Paste a link to an image (e.g., from WhatsApp, Google Images, etc.)
   - **Upload Image**: Select an image file from your device
3. Click **"Analyze & Add"**
4. Wait 10-30 seconds for AI analysis
5. The song will be automatically added to your library!

## How It Works

The AI uses GPT-4 Vision to:
1. **Read the image** - Understands the chord sheet layout
2. **Extract metadata** - Title, artist, key, tempo, etc.
3. **Parse structure** - Identifies verses, choruses, bridges
4. **Align chords with lyrics** - Maps each chord to its corresponding word
5. **Detect language** - Automatically identifies Hebrew vs English
6. **Format data** - Converts to the app's structured format

## Cost Considerations

- Uses GPT-4 Vision model (gpt-4o)
- Cost: ~$0.01-0.05 per analysis (depending on image size)
- Free tier: OpenAI provides $5 free credit for new accounts
- For production: Consider adding rate limiting or usage limits

## Troubleshooting

### "Failed to analyze chord sheet"

- Check that `OPENAI_API_KEY` is set correctly
- Verify you have API credits available
- Ensure the image URL is accessible (not behind authentication)
- Try a different image format (JPG, PNG work best)

### "Invalid URL format"

- Make sure the URL starts with `http://` or `https://`
- The URL should point directly to an image file
- Some sites block direct image access - try downloading and uploading instead

### Slow Analysis

- GPT-4 Vision can take 10-30 seconds
- Large images take longer
- This is normal - be patient!

## Alternative LLM Providers

If you want to use a different provider (Anthropic Claude, Google Gemini, etc.), you can modify `lib/llm-analyzer.ts` to use their APIs instead.

