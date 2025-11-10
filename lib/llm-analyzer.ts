import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChordSheet, Section, ChordLine } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface AnalyzeOptions {
  url?: string;
  imageBase64?: string;
  imageUrl?: string;
  textContent?: string; // For direct text input from web pages
}

// Helper function to extract text from HTML
async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Extract text from common chord sheet containers
    // Look for common patterns in tab websites
    const patterns = [
      /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
      /<div[^>]*class="[^"]*chord[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*tab[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
    ];
    
    let extractedText = '';
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          // Remove HTML tags and decode entities
          const clean = match[1]
            .replace(/<[^>]+>/g, '\n')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
          if (clean.length > 50) { // Only use substantial content
            extractedText += clean + '\n\n';
          }
        }
      }
    }
    
    // If no specific patterns found, extract all text
    if (!extractedText) {
      text = text.replace(/<[^>]+>/g, '\n');
      text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
      extractedText = text;
    }
    
    // Clean up whitespace
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
    
    return extractedText || 'Could not extract text from webpage';
  } catch (error: any) {
    throw new Error(`Failed to extract text from URL: ${error.message}`);
  }
}

// Check if URL is likely an image
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('image') ||
         lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i);
}

export async function analyzeChordSheet(options: AnalyzeOptions): Promise<ChordSheet> {
  const { url, imageBase64, imageUrl, textContent } = options;

  // Build the content array for the API
  const content: any[] = [
    {
      type: 'text',
      text: `Analyze this chord sheet and extract the following information in JSON format:
{
  "title": "Song title (primary language)",
  "titleEn": "English title if different (optional)",
  "artist": "Artist name (primary language)",
  "artistEn": "English artist name if different (optional)",
  "language": "he" or "en",
  "key": "Musical key (e.g., 'C', 'Am', 'G')",
  "tempo": "Tempo description (e.g., 'Moderate', 'Slow')",
  "capo": number or null,
  "sections": [
    {
      "id": "unique-id",
      "type": "verse" | "chorus" | "bridge" | "intro" | "outro",
      "label": "Section label (e.g., 'VERSE 1', 'בית 1', 'CHORUS', 'פזמון')",
      "lines": [
        {
          "chords": ["array", "of", "chords", "for", "each", "word"],
          "lyrics": "Full lyrics line"
        }
      ]
    }
  ]
}

Important:
- Extract chords and lyrics line by line
- For each line, provide an array of chords where each chord corresponds to a word in the lyrics
- If a word has no chord, use an empty string ""
- Preserve the exact structure: chords array length should match the number of words
- Identify the language (he for Hebrew, en for English)
- Extract all sections (verses, choruses, etc.)
- For Hebrew songs, use Hebrew labels (בית, פזמון, etc.)
- Return ONLY valid JSON, no markdown formatting`
    }
  ];

  // Add image if provided
  if (imageBase64) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${imageBase64}`
      }
    });
  } else if (imageUrl) {
    content.push({
      type: 'image_url',
      image_url: {
        url: imageUrl
      }
    });
  } else if (url) {
    // Check if URL is an image or a webpage
    if (isImageUrl(url)) {
      // Handle as image
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mimeType = blob.type || 'image/jpeg';
        
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64}`
          }
        });
      } catch (error) {
        throw new Error(`Failed to fetch image from URL: ${error}`);
      }
    } else {
      // Handle as webpage - extract text content
      // This will be processed below
    }
  } else if (textContent) {
    // Direct text content provided
    content[0].text += `\n\nChord sheet content to analyze:\n${textContent}`;
  } else {
    throw new Error('No image, URL, or text content provided');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Fast and free, supports vision
    
    let prompt = content[0].text;
    let imageData: { mimeType: string; data: string } | null = null;
    let extractedText = '';
    
    // Handle different input types
    if (url && !isImageUrl(url)) {
      // Webpage URL - extract text content
      extractedText = await extractTextFromUrl(url);
      prompt += `\n\nChord sheet content extracted from webpage (${url}):\n\n${extractedText}`;
    } else if (textContent) {
      // Direct text content
      prompt += `\n\nChord sheet content to analyze:\n\n${textContent}`;
    } else if (imageBase64) {
      // Base64 image
      imageData = {
        mimeType: 'image/jpeg', // Default, could be detected
        data: imageBase64
      };
    } else if (imageUrl || (url && isImageUrl(url))) {
      // Image URL - fetch and convert to base64
      try {
        const imageUrlToFetch = imageUrl || url!;
        const response = await fetch(imageUrlToFetch);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mimeType = blob.type || 'image/jpeg';
        
        imageData = {
          mimeType,
          data: base64
        };
      } catch (error) {
        throw new Error(`Failed to fetch image from URL: ${error}`);
      }
    }

    // Build the request for Gemini
    const parts: any[] = [{ text: prompt }];
    
    // Add image if available
    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.data
        }
      });
    }

    // Call Gemini API
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
        responseMimeType: 'application/json',
      },
    });

    const response = result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('No response from Gemini');
    }

    // Parse the JSON response
    // Gemini may wrap JSON in markdown code blocks, so clean it up
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    }
    const parsed = JSON.parse(jsonText);
    
    // Convert to ChordSheet format
    const sheet: ChordSheet = {
      id: `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: parsed.title || 'Untitled',
      titleEn: parsed.titleEn,
      artist: parsed.artist || 'Unknown',
      artistEn: parsed.artistEn,
      language: parsed.language === 'he' ? 'he' : 'en',
      key: parsed.key,
      tempo: parsed.tempo,
      capo: parsed.capo !== null && parsed.capo !== undefined ? parsed.capo : undefined,
      sections: (parsed.sections || []).map((sec: any, idx: number) => ({
        id: sec.id || `sec-${idx + 1}`,
        type: sec.type || 'verse',
        label: sec.label || '',
        lines: (sec.lines || []).map((line: any) => ({
          chords: Array.isArray(line.chords) ? line.chords : [],
          lyrics: line.lyrics || ''
        }))
      })),
      dateAdded: new Date().toISOString().split('T')[0],
    };

    return sheet;
  } catch (error: any) {
    console.error('Error analyzing chord sheet:', error);
    
    // Check for rate limit errors
    const errorMessage = error.message || error.toString() || '';
    const errorStatus = error.status || error.statusCode || '';
    
    if (
      errorStatus === 429 ||
      errorMessage.includes('429') ||
      errorMessage.toLowerCase().includes('rate limit') ||
      errorMessage.toLowerCase().includes('quota') ||
      errorMessage.toLowerCase().includes('resource exhausted') ||
      errorMessage.toLowerCase().includes('too many requests')
    ) {
      throw new Error(
        'Rate limit exceeded. The free tier allows 15 requests per minute and 1,500 per day. ' +
        'Please wait a moment and try again, or upgrade your Gemini API quota.'
      );
    }
    
    // Check for API key errors
    if (
      errorStatus === 401 ||
      errorStatus === 403 ||
      errorMessage.toLowerCase().includes('api key') ||
      errorMessage.toLowerCase().includes('unauthorized') ||
      errorMessage.toLowerCase().includes('permission denied')
    ) {
      throw new Error(
        'Invalid or missing Gemini API key. Please check your GEMINI_API_KEY environment variable.'
      );
    }
    
    throw new Error(`Failed to analyze chord sheet: ${error.message || error}`);
  }
}

