# Groq Setup Guide

The app now uses **Groq** instead of OpenAI for LLM analysis. Groq offers a **free tier** with fast inference!

## Why Groq?

- ✅ **Free tier available** - No credit card required
- ✅ **Very fast** - Ultra-low latency inference
- ✅ **High rate limits** - Free tier: 14,400 requests/day
- ✅ **Powerful models** - Llama 3.1, Mixtral, and more

## Setup Instructions

### Step 1: Get Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account (or sign in)
3. Navigate to **API Keys** section
4. Click **"Create API Key"**
5. Copy your API key

### Step 2: Add API Key Locally

Create or update `.env.local`:

```bash
GROQ_API_KEY=your_groq_api_key_here
```

### Step 3: Add to Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add:
   - **Key**: `GROQ_API_KEY`
   - **Value**: Your Groq API key
   - **Environments**: Production, Preview, Development
3. **Redeploy** your application

## Important Notes

⚠️ **Image Analysis Limitation**: 
- Groq doesn't natively support vision models like OpenAI GPT-4 Vision
- For image analysis, you may need to:
  1. Use an OCR service first to extract text from images
  2. Or manually type/paste the chord sheet content
  3. Or use a hybrid approach with a separate vision API

**Workaround Options:**
- Use a free OCR service (like Tesseract.js) to extract text from images first
- Then send the extracted text to Groq for analysis
- Or accept text input directly from users

## Free Tier Limits

- **14,400 requests per day**
- **30 requests per minute**
- Perfect for personal use!

## Testing Locally

```bash
# Install dependencies
npm install

# Make sure .env.local has GROQ_API_KEY
# Then run:
npm run dev
```

## Troubleshooting

**"Invalid API key" error:**
- Verify your Groq API key is correct
- Make sure it's set in `.env.local` (local) or Vercel environment variables (production)

**"Rate limit exceeded":**
- Free tier: 30 requests/minute
- Wait a minute and try again
- Consider upgrading if you need higher limits

**Image analysis not working:**
- Groq doesn't support vision models
- Use OCR to extract text first, or accept text input
- See workaround options above

