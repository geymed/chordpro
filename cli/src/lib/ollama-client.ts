import axios, { AxiosInstance } from 'axios';
import { ChordSheet } from '../types';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  format?: 'json' | string;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

class OllamaClient {
  private client: AxiosInstance;
  private defaultModel: string;

  constructor(url: string = OLLAMA_URL, defaultModel: string = 'llama3.1:8b') {
    this.client = axios.create({
      baseURL: url,
      timeout: 300000, // 5 minutes timeout for large analyses
    });
    this.defaultModel = defaultModel;
  }

  /**
   * Checks if Ollama is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Lists available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      throw new Error(`Failed to list Ollama models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generates a response from Ollama
   */
  async generate(request: OllamaGenerateRequest): Promise<string> {
    try {
      const response = await this.client.post<OllamaGenerateResponse>('/api/generate', {
        model: request.model || this.defaultModel,
        prompt: request.prompt,
        stream: request.stream ?? false,
        format: request.format,
        options: request.options,
      });

      if (request.stream) {
        // Handle streaming response
        throw new Error('Streaming not yet implemented');
      }

      return response.data.response;
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

  /**
   * Analyzes a chord sheet using Ollama
   * This is a simplified version - you'll need to adapt your existing analysis logic
   */
  /**
   * Analyzes a chord sheet using Ollama
   */
  async analyzeChordSheet(input: {
    text: string;
    source?: string;
  }, model?: string): Promise<ChordSheet[]> {
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

Input Text:
${input.text}
`;

    try {
      const response = await this.generate({
        model: model || this.defaultModel,
        prompt,
        format: 'json',
        options: {
          temperature: 0.2,
          num_predict: 16384,
        },
      });

      // Parse the JSON response
      let parsed: any;
      try {
        parsed = JSON.parse(response);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          // Maybe it returned a single object instead of array?
          const singleMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (singleMatch) {
            parsed = [JSON.parse(singleMatch[1])];
          } else {
            // Try parsing as single object if array parse failed
            try {
              const single = JSON.parse(response);
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
        id: `sheet-${Date.now()}-${index}`,
        title: item.title || 'Untitled',
        titleEn: item.titleEn,
        artist: item.artist || 'Unknown',
        artistEn: item.artistEn,
        language: item.language || 'en',
        key: item.key,
        tempo: item.tempo,
        capo: item.capo,
        sections: item.sections || [],
        dateAdded: new Date().toISOString(),
      }));

    } catch (error) {
      throw new Error(`Failed to analyze chord sheet with Ollama: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const ollamaClient = new OllamaClient();
export default OllamaClient;

