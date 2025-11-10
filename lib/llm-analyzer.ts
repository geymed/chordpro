import OpenAI from 'openai';
import { ChordSheet, Section, ChordLine } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalyzeOptions {
  url?: string;
  imageBase64?: string;
  imageUrl?: string;
}

export async function analyzeChordSheet(options: AnalyzeOptions): Promise<ChordSheet> {
  const { url, imageBase64, imageUrl } = options;

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
    // For URL, we'll fetch the content first
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
    throw new Error('No image or URL provided');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-4-vision-preview' for better image analysis
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const parsed = JSON.parse(result);
    
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
    throw new Error(`Failed to analyze chord sheet: ${error.message}`);
  }
}

