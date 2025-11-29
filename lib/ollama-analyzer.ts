import axios from 'axios';
import { ChordSheet } from '@/types';
import { parseChord } from '@/lib/chord-utils';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

interface AnalyzeOptions {
  url?: string;
  imageBase64?: string;
  text?: string;
  model?: string;
}

/**
 * Checks if Ollama is available
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Lists available Ollama models
 */
export async function listOllamaModels(): Promise<string[]> {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    return response.data.models?.map((m: any) => m.name) || [];
  } catch (error) {
    throw new Error(`Failed to list Ollama models: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Analyzes a chord sheet using Ollama
 */
/**
 * Analyzes a chord sheet using Ollama
 */
export async function analyzeChordSheetWithOllama(options: AnalyzeOptions): Promise<ChordSheet[]> {
  const model = options.model || DEFAULT_MODEL;

  // Build the prompt
  let prompt = `Analyze the following text and extract guitar chord sheets. 
The text may contain one or more songs. 
Return a JSON ARRAY of objects, where each object represents a song and has this exact structure:

[
  {
    "title": "Song Title",
    "titleEn": "English Title (optional)",
    "artist": "Artist Name",
    "artistEn": "English Artist Name (optional)",
    "language": "he" or "en",
    "key": "C" (optional),
    "tempo": "120 BPM" (optional),
    "capo": 0 (optional),
    "sections": [
      {
        "id": "section-1",
        "type": "verse" or "chorus" or "bridge" or "intro" or "outro",
        "label": "Verse 1",
        "lines": [
          {
            "chords": ["C", "Am", "F", "G"],
            "lyrics": "Line of lyrics here"
          }
        ]
      }
    ]
  }
]

If there is only one song, still return an array with one object.
Return ONLY valid JSON, no markdown formatting, no code blocks.

IMPORTANT FOR HEBREW/RTL TEXT:
- The input text might contain Hebrew characters.
- Do NOT reverse the Hebrew text. Keep it exactly as it appears in the input.
- If the input text looks like "םולש", do NOT change it to "שלום".
- Chords are usually Left-to-Right (LTR) while lyrics are Right-to-Left (RTL).
- Maintain the association between chords and the lyrics they appear above/next to.
- Extract the Hebrew lyrics EXACTLY as provided. Do not try to "fix" or reorder words.
`;

  if (options.text) {
    prompt += `\nInput Text:\n${options.text}\n\n`;
  } else if (options.url) {
    // Note: URL should ideally be pre-processed by content-extractor before calling this, 
    // but we keep this for backward compatibility if needed, though the prompt expects text now.
    prompt += `\nChord sheet URL: ${options.url}\n\n`;
    prompt += `Please fetch and analyze the content from this URL.\n\n`;
  } else if (options.imageBase64) {
    prompt += `\nChord sheet image provided (base64). Please analyze the image.\n\n`;
  }

  try {
    // Build request body
    const requestBody: any = {
      model,
      prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2,
        num_predict: 16384,
      },
    };

    // Add images array if imageBase64 is provided (for vision models)
    if (options.imageBase64) {
      requestBody.images = [options.imageBase64];
    }

    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      requestBody,
      {
        timeout: 300000, // 5 minutes
      }
    );

    // Parse the JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(response.data.response);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.data.response.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        // Maybe it returned a single object instead of array?
        const singleMatch = response.data.response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (singleMatch) {
          parsed = [JSON.parse(singleMatch[1])];
        } else {
          // Try parsing as single object if array parse failed
          try {
            const single = JSON.parse(response.data.response);
            if (!Array.isArray(single)) {
              parsed = [single];
            } else {
              parsed = single;
            }
          } catch (e) {
            throw new Error('Failed to parse JSON response from Ollama');
          }
        }
      }
    }

    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    // Convert to ChordSheet format
    return parsed.map((item: any, index: number) => ({
      id: `sheet-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
      title: item.title || 'Untitled',
      titleEn: item.titleEn,
      artist: item.artist || 'Unknown',
      artistEn: item.artistEn,
      language: item.language || 'en',
      key: item.key,
      tempo: item.tempo,
      capo: item.capo,
      sections: (item.sections || []).map((section: any, secIndex: number) => ({
        id: section.id || `section-${secIndex + 1}`,
        type: section.type || 'verse',
        label: section.label || `Section ${secIndex + 1}`,
        lines: (section.lines || []).map((line: any) => ({
          chords: (line.chords || []).map((chord: string) => {
            const parsedChord = parseChord(chord);
            return parsedChord || chord;
          }),
          lyrics: line.lyrics || '',
        })),
      })),
      dateAdded: new Date().toISOString().split('T')[0],
    }));

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${OLLAMA_URL}. Make sure Ollama is running.`);
      }
      throw new Error(`Ollama API error: ${error.message}`);
    }
    throw error;
  }
}

