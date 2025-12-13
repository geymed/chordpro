import { NextRequest, NextResponse } from 'next/server';
import { ChordSheet } from '@/types';
import { parseChord, chordToString } from '@/lib/chord-utils';

/**
 * POST /api/validate-ocr
 * Uses Gemini Vision API to validate OCR results against the original image
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const extractedSheetJson = formData.get('sheet') as string;

    if (!imageFile || !extractedSheetJson) {
      return NextResponse.json(
        { error: 'Missing image or sheet data' },
        { status: 400 }
      );
    }

    const extractedSheet: Partial<ChordSheet> = JSON.parse(extractedSheetJson);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // If no API key, just validate chords and return
      return NextResponse.json(validateChordSheet(extractedSheet));
    }

    // Convert image to base64
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    // Format the extracted sheet for the prompt
    const sheetText = formatSheetForValidation(extractedSheet);

    const prompt = `You are a music expert analyzing a chord sheet image. 

I've extracted the following chord sheet from an image using OCR:
${sheetText}

Please:
1. Verify the chords are correctly extracted and match standard chord notation (C, Am, F#m, Bb7, etc.)
2. Check that chords are properly aligned with their corresponding words
3. Fix any OCR errors in chord names (e.g., "di" -> "dim", "rn" -> "m")
4. Ensure section labels are correct (Verse, Chorus, Bridge, etc.)
5. Verify title and artist are correctly extracted

Return a corrected JSON object in this exact format:
{
  "title": "corrected title",
  "artist": "corrected artist",
  "sections": [
    {
      "id": "section-1",
      "label": "Verse",
      "lines": [
        {
          "words": [
            {"word": "word text", "chord": "Am"},
            {"word": "another", "chord": "F"}
          ]
        }
      ]
    }
  ]
}

Only return the JSON, no other text.`;

    // Try v1 API with gemini-1.5-flash first, then fallback to gemini-pro-vision
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inline_data: {
                    mime_type: imageFile.type || 'image/png',
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        })
      }
    );

    // If v1 fails, try v1beta with gemini-pro-vision as fallback
    if (!response.ok) {
      console.warn('gemini-1.5-flash failed, trying gemini-pro-vision...');
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  },
                  {
                    inline_data: {
                      mime_type: imageFile.type || 'image/png',
                      data: imageBase64
                    }
                  }
                ]
              }
            ]
          })
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      // Fall back to regular validation
      return NextResponse.json(validateChordSheet(extractedSheet));
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response (might be wrapped in markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in LLM response');
      return NextResponse.json(validateChordSheet(extractedSheet));
    }

    const validatedSheet = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize chords using parseChord
    return NextResponse.json(validateAndNormalizeSheet(validatedSheet));
  } catch (error: any) {
    console.error('LLM validation failed:', error);
    return NextResponse.json(
      { error: 'Validation failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Formats a chord sheet for the validation prompt
 */
function formatSheetForValidation(sheet: Partial<ChordSheet>): string {
  let text = `Title: ${sheet.title || 'N/A'}\n`;
  text += `Artist: ${sheet.artist || 'N/A'}\n\n`;
  
  sheet.sections?.forEach((section) => {
    text += `[${section.label}]\n`;
    section.lines.forEach(line => {
      const chordLine = line.words.map(w => w.chord || '-').join(' ');
      const lyricLine = line.words.map(w => w.word).join(' ');
      text += `Chords: ${chordLine}\n`;
      text += `Lyrics: ${lyricLine}\n\n`;
    });
  });
  
  return text;
}

/**
 * Validates and normalizes chords in the LLM-validated sheet
 */
function validateAndNormalizeSheet(sheet: any): Partial<ChordSheet> {
  if (!sheet.sections) {
    return sheet;
  }

  const validatedSections = sheet.sections.map((section: any) => ({
    ...section,
    lines: section.lines.map((line: any) => ({
      words: line.words.map((word: any) => {
        const validatedChord = validateChord(word.chord);
        return {
          word: word.word || '',
          chord: validatedChord
        };
      })
    }))
  }));

  return {
    ...sheet,
    sections: validatedSections
  };
}

/**
 * Validates a single chord using parseChord
 */
function validateChord(chordStr: string | undefined): string | undefined {
  if (!chordStr || chordStr.trim() === '') {
    return undefined;
  }

  const parsed = parseChord(chordStr.trim());
  if (parsed) {
    return chordToString(parsed);
  }
  
  return undefined;
}

/**
 * Validates and cleans all chords in a chord sheet
 */
function validateChordSheet(sheet: Partial<ChordSheet>): Partial<ChordSheet> {
  if (!sheet.sections) {
    return sheet;
  }

  const validatedSections = sheet.sections.map(section => ({
    ...section,
    lines: section.lines.map(line => ({
      words: line.words.map(word => ({
        word: word.word,
        chord: validateChord(word.chord)
      }))
    }))
  }));

  return {
    ...sheet,
    sections: validatedSections
  };
}

