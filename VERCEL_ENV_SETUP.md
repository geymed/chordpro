# Adding Environment Variables to Vercel

## Method 1: Via Vercel Dashboard (Easiest)

1. **Go to your Vercel project:**
   - Visit [vercel.com](https://vercel.com)
   - Sign in to your account
   - Click on your project (or create one if you haven't deployed yet)

2. **Navigate to Settings:**
   - Click on **"Settings"** in the top navigation
   - Click on **"Environment Variables"** in the left sidebar

3. **Add the OpenAI API Key:**
   - Click **"Add New"** button
   - **Key**: `OPENAI_API_KEY`
   - **Value**: `******`
   - **Environments**: Check all three:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
   - Click **"Save"**

4. **Redeploy your application:**
   - Go to **"Deployments"** tab
   - Click the three dots (⋯) on your latest deployment
   - Click **"Redeploy"**
   - Or simply push a new commit to trigger a new deployment

## Method 2: Via Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Link your project (if not already linked)
vercel link

# Add the environment variable
vercel env add OPENAI_API_KEY

# When prompted, paste your API key:
# 

# Select environments (choose all: production, preview, development)
# Then redeploy
vercel --prod
```

## Method 3: Via vercel.json (Not Recommended for Secrets)

⚠️ **Don't add API keys to vercel.json** - it gets committed to git!

## Verification

After adding the environment variable and redeploying:

1. Your app should work with the LLM analysis feature
2. You can verify it's set by checking the deployment logs
3. Test by uploading a chord sheet image

## Important Notes

- ✅ Environment variables are encrypted in Vercel
- ✅ They're only available to your serverless functions (not exposed to the browser)
- ✅ You need to redeploy after adding new environment variables
- ⚠️ Never commit API keys to git
- ⚠️ If your key is exposed, revoke it and create a new one

## Troubleshooting

**"Environment variable not found" error:**
- Make sure you selected all environments (Production, Preview, Development)
- Redeploy after adding the variable
- Check the variable name is exactly `OPENAI_API_KEY` (case-sensitive)

**Still not working after redeploy:**
- Check Vercel deployment logs for errors
- Verify the API key is correct
- Make sure you have OpenAI API credits

