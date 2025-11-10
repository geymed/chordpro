# Google Gemini Setup Guide

The app uses **Google Gemini** for LLM analysis with **full vision support**! 🎉

## Why Gemini?

- ✅ **Free tier** - Generous free quota
- ✅ **Vision support** - Can analyze images directly!
- ✅ **Fast** - Gemini 1.5 Flash is very fast
- ✅ **Webpage support** - Can extract content from URLs
- ✅ **No credit card required** for free tier

## Free Tier Limits

- **15 requests per minute**
- **1,500 requests per day**
- Perfect for personal use!

## Setup Instructions

### Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select or create a Google Cloud project (free tier works!)
5. Copy your API key

### Step 2: Add API Key Locally

Create or update `.env.local`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Add to Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key
   - **Environments**: Production, Preview, Development
3. **Redeploy** your application

## Features Supported

✅ **Image Upload** - Direct image analysis  
✅ **Image URLs** - Fetch and analyze images from URLs  
✅ **Webpage URLs** - Extract and analyze chord sheets from tab websites (tab4u, etc.)  
✅ **Text Input** - Direct text analysis  

## Testing Locally

```bash
# Install dependencies
npm install

# Make sure .env.local has GEMINI_API_KEY
# Then run:
npm run dev
```

## Troubleshooting

**"Invalid API key" error:**
- Verify your Gemini API key is correct
- Make sure it's set in `.env.local` (local) or Vercel environment variables (production)

**"Rate limit exceeded":**
- Free tier: 15 requests/minute, 1,500/day
- Wait a minute and try again
- Consider upgrading if you need higher limits

**"Image analysis failed":**
- Check image format (JPG, PNG work best)
- Ensure image URL is publicly accessible
- Try a different image

## Cost

- **Free tier**: 1,500 requests/day
- **Paid tier**: Very affordable if you exceed free limits
- Much cheaper than OpenAI!

