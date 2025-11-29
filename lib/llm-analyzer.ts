import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChordSheet, Section, ChordLine, Chord } from '@/types';
import { parseChord, chordToString } from '@/lib/chord-utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface AnalyzeOptions {
  url?: string;
  imageBase64?: string;
  imageUrl?: string;
  textContent?: string; // For direct text input from web pages
}

/**
 * Validates if a chord name is valid (string or Chord object)
 * Supports: basic chords (A-G), sharps/flats, minors, majors, extensions, inversions
 * Examples: C, Cm, C7, Cmaj7, Cm7, Cdim, Caug, Csus4, C/E, C#m, Bb, etc.
 */
function isValidChord(chord: string | Chord | null): boolean {
  // Empty/null is valid (no chord)
  if (!chord) {
    return true;
  }

  // If it's already a Chord object, it's valid
  if (typeof chord !== 'string') {
    return true; // Structured Chord objects are considered valid
  }

  const trimmed = chord.trim();
  
  // Basic chord pattern: Root note (A-G) with optional sharp/flat, followed by modifiers
  // Pattern breakdown:
  // - Root: A-G (case insensitive)
  // - Optional: # (sharp) or b (flat)
  // - Optional modifiers: m, maj, dim, aug, sus, add, etc.
  // - Optional extensions: 2, 4, 5, 6, 7, 9, 11, 13, etc.
  // - Optional inversion: / followed by note
  const chordPattern = /^[A-G](?:#|b)?(?:m(?:aj|in)?|dim|aug|sus[24]?|add[2469]|maj|min)?(?:\d+|\([^)]+\))?(?:\/[A-G](?:#|b)?)?$/i;
  
  // Also allow common variations and extended chords
  const extendedPattern = /^[A-G](?:#|b)?(?:m(?:aj|in)?|dim|aug|sus[24]?|add[2469]|maj|min)?(?:\d+|\([^)]+\))*(?:\/[A-G](?:#|b)?)?$/i;
  
  // Check against both patterns
  if (chordPattern.test(trimmed) || extendedPattern.test(trimmed)) {
    return true;
  }
  
  // Allow some common non-standard but valid formats
  // Like "N.C." (no chord), "x" (muted), or numbers for capo positions
  const specialCases = /^(N\.?C\.?|x|X|\d+)$/i;
  if (specialCases.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Finds the closest valid chord to an invalid chord name
 * Uses common patterns and typo corrections
 */
function findClosestValidChord(invalidChord: string): string {
  const trimmed = invalidChord.trim();
  
  // First, handle truncated "di" -> "dim" BEFORE any other processing
  // This must come first to catch cases like "G#di"
  if (/^[A-G][#b]?di$/i.test(trimmed)) {
    const fixed = trimmed.replace(/di$/i, 'dim');
    if (isValidChord(fixed)) {
      return fixed;
    }
  }
  
  // Remove extra spaces and normalize
  let cleaned = trimmed.replace(/\s+/g, '').replace(/[^\w#\/]/g, '');
  
  // Common typos and fixes
  const fixes: { pattern: RegExp; replacement: string }[] = [
    // Fix "diminished" - handle truncated "di" -> "dim" (check again after cleaning)
    { pattern: /([A-G][#b]?)di$/i, replacement: '$1dim' },
    { pattern: /([A-G][#b]?)\s*diminished/gi, replacement: '$1dim' },
    { pattern: /([A-G][#b]?)\s*dim/gi, replacement: '$1dim' },
    // Fix "minor" spelled out
    { pattern: /([A-G][#b]?)\s*minor/gi, replacement: '$1m' },
    { pattern: /([A-G][#b]?)\s*min/gi, replacement: '$1m' },
    // Fix "major" spelled out
    { pattern: /([A-G][#b]?)\s*major/gi, replacement: '$1maj' },
    { pattern: /([A-G][#b]?)\s*maj/gi, replacement: '$1maj' },
    // Fix "augmented"
    { pattern: /([A-G][#b]?)\s*augmented/gi, replacement: '$1aug' },
    { pattern: /([A-G][#b]?)\s*aug/gi, replacement: '$1aug' },
    // Fix "sharp" spelled out
    { pattern: /([A-G])\s*sharp/gi, replacement: '$1#' },
    { pattern: /([A-G])\s*#/gi, replacement: '$1#' },
    // Fix "flat" spelled out
    { pattern: /([A-G])\s*flat/gi, replacement: '$1b' },
    { pattern: /([A-G])\s*b/gi, replacement: '$1b' },
    // Fix common chord name variations
    { pattern: /([A-G][#b]?)m7/gi, replacement: '$1m7' },
    { pattern: /([A-G][#b]?)7/gi, replacement: '$17' },
    { pattern: /([A-G][#b]?)9/gi, replacement: '$19' },
    // Remove invalid characters but keep structure
    { pattern: /[^A-G#bmajdimaugsusadd\/\d()]/gi, replacement: '' },
  ];
  
  for (const fix of fixes) {
    cleaned = cleaned.replace(fix.pattern, fix.replacement);
  }
  
  // Try to extract root note and build valid chord
  const rootMatch = cleaned.match(/^([A-G][#b]?)/i);
  if (rootMatch) {
    const root = rootMatch[1];
    const rest = cleaned.substring(rootMatch[0].length);
    
    // Check if rest contains "dim" or "di" (truncated dim) - prioritize dim
    if (rest.match(/^di$/i) || rest.match(/^dim/i)) {
      const dimChord = root + 'dim';
      if (isValidChord(dimChord)) {
        return dimChord;
      }
    }
    
    // Common chord patterns to try
    const commonPatterns = [
      root,                    // Just root
      root + 'm',              // Minor
      root + 'dim',            // Diminished
      root + 'aug',            // Augmented
      root + '7',              // Dominant 7th
      root + 'm7',             // Minor 7th
      root + 'maj7',           // Major 7th
      root + '9',              // 9th
      root + 'm9',             // Minor 9th
    ];
    
    // Check if any pattern matches
    for (const pattern of commonPatterns) {
      if (isValidChord(pattern)) {
        // If rest contains slash, try to preserve inversion
        const slashMatch = rest.match(/\/([A-G][#b]?)/i);
        if (slashMatch) {
          const inversion = pattern + '/' + slashMatch[1];
          if (isValidChord(inversion)) {
            return inversion;
          }
        }
        return pattern;
      }
    }
    
    // If we have a root, return just the root as fallback
    return root;
  }
  
  // If we can't fix it, return empty string (no chord)
  return '';
}

/**
 * Validates and fixes chord names in a chord sheet
 * Returns the fixed sheet and array of fixes made
 * Parses and stores chords as structured Chord objects
 */
function validateAndFixChordSheet(sheet: ChordSheet): { sheet: ChordSheet; fixes: string[] } {
  const fixes: string[] = [];
  const fixedSheet: ChordSheet = {
    ...sheet,
    sections: sheet.sections.map((section, sectionIdx) => ({
      ...section,
      lines: section.lines.map((line, lineIdx) => {
        if (!Array.isArray(line.chords)) {
          return { ...line, chords: [] };
        }
        
        const fixedChords = line.chords.map((chord, chordIdx) => {
          // Handle both string and Chord object
          let chordStr: string;
          if (typeof chord === 'string') {
            chordStr = chord;
          } else if (chord && typeof chord === 'object' && 'note' in chord) {
            // It's already a Chord object, convert to string to validate/fix
            chordStr = chordToString(chord);
          } else {
            // Invalid format, try to convert to string
            chordStr = String(chord || '');
          }
          
          if (!chordStr || chordStr.trim() === '') {
            return '';
          }
          
          // First, try to fix common issues (like "G#di" -> "G#dim")
          const fixedChordStr = findClosestValidChord(chordStr);
          
          // Validate the fixed chord
          if (!isValidChord(fixedChordStr)) {
            // If still invalid, try to parse and reconstruct
            const parsed = parseChord(fixedChordStr);
            if (parsed) {
              const reconstructed = chordToString(parsed);
              if (isValidChord(reconstructed)) {
                if (reconstructed !== chordStr) {
                  fixes.push(
                    `Section ${sectionIdx + 1}, line ${lineIdx + 1}, chord ${chordIdx + 1}: ` +
                    `"${chordStr}" → "${reconstructed}"`
                  );
                }
                return parsed; // Return Chord object
              }
            }
            // Fallback: return empty string if we can't fix it
            if (chordStr !== '') {
              fixes.push(
                `Section ${sectionIdx + 1}, line ${lineIdx + 1}, chord ${chordIdx + 1}: ` +
                `"${chordStr}" → "" (could not fix)`
              );
            }
            return '';
          }
          
          // Parse the fixed chord into a Chord object
          const parsedChord = parseChord(fixedChordStr);
          if (parsedChord) {
            if (fixedChordStr !== chordStr) {
              fixes.push(
                `Section ${sectionIdx + 1}, line ${lineIdx + 1}, chord ${chordIdx + 1}: ` +
                `"${chordStr}" → "${fixedChordStr}"`
              );
            }
            return parsedChord; // Return Chord object
          }
          
          // If parsing fails but chord is valid, return as string (fallback)
          return fixedChordStr;
        });
        
        return { ...line, chords: fixedChords };
      })
    }))
  };
  
  // Fix key if invalid
  if (fixedSheet.key && !isValidChord(fixedSheet.key)) {
    const fixedKey = findClosestValidChord(fixedSheet.key);
    if (fixedKey !== fixedSheet.key) {
      fixes.push(`Key: "${fixedSheet.key}" → "${fixedKey}"`);
      fixedSheet.key = fixedKey;
    }
  }
  
  return { sheet: fixedSheet, fixes };
}

// Helper function to extract text from HTML
async function extractTextFromUrl(url: string): Promise<string> {
  try {
    console.log(`Extracting text from URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`Fetched HTML, length: ${html.length} characters`);
    
    if (!html || html.length < 100) {
      throw new Error('Received empty or very short HTML response');
    }
    
    // For Ultimate Guitar, try to find the tab content section first
    let tabContent = '';
    
    // Ultimate Guitar specific: Look for tab content in various containers
    const ultimateGuitarPatterns = [
      // Most common: js-tab-content container
      /<div[^>]*class="[^"]*js-tab-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Alternative containers
      /<div[^>]*class="[^"]*js-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*tab[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*tab[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Look for pre-formatted tab content
      /<pre[^>]*class="[^"]*js-tab-content[^"]*"[^>]*>([\s\S]*?)<\/pre>/i,
      /<pre[^>]*id="[^"]*tab[^"]*"[^>]*>([\s\S]*?)<\/pre>/i,
    ];
    
    for (const pattern of ultimateGuitarPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].length > 100) {
        tabContent = match[1];
        console.log(`Found Ultimate Guitar tab content section (${tabContent.length} chars)`);
        break;
      }
    }
    
    // If we found a specific tab section, use it; otherwise extract from whole page
    let text = tabContent || html;
    
    // Remove script and style tags
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    
    // Extract text from common chord sheet containers
    // Look for common patterns in tab websites (including tab4u, Ultimate Guitar, etc.)
    const patterns = [
      // Pre-formatted text (common in tab sites)
      /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
      // Ultimate Guitar specific patterns
      /<div[^>]*class="[^"]*js-tab-content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*js-content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*data-content="([^"]*)"[^>]*>/gi,
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      // Tab4u and similar sites
      /<div[^>]*class="[^"]*chord[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*tab[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*song[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      // Common semantic HTML
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      /<section[^>]*>([\s\S]*?)<\/section>/gi,
      // Textarea or code blocks
      /<textarea[^>]*>([\s\S]*?)<\/textarea>/gi,
      /<code[^>]*>([\s\S]*?)<\/code>/gi,
      // Ultimate Guitar - look for tab text in various containers
      /<span[^>]*class="[^"]*chord[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
      /<p[^>]*class="[^"]*chord[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
    ];
    
    let extractedText = '';
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          // Remove HTML tags and decode entities
          let clean = match[1]
            .replace(/<[^>]+>/g, '\n')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')
            .replace(/&hellip;/g, '...')
            .trim();
          
          // Only use substantial content (lowered threshold for tab sites)
          if (clean.length > 30) {
            extractedText += clean + '\n\n';
          }
        }
      }
    }
    
    console.log(`Extracted text length after patterns: ${extractedText.length} characters`);
    
    // If we found tab content section but patterns didn't extract much, extract directly from it
    if (tabContent && extractedText.length < 200) {
      console.log('Extracting directly from tab content section');
      // Remove HTML tags but preserve structure
      let cleanTab = tabContent
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&hellip;/g, '...')
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
      
      if (cleanTab.length > extractedText.length) {
        extractedText = cleanTab;
        console.log(`Extracted ${extractedText.length} chars from tab content section`);
      }
    }
    
    // If no specific patterns found, extract all text from body
    if (!extractedText || extractedText.trim().length < 50) {
      console.log('No patterns matched, extracting all text from body');
      
      // Try to find body content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        text = bodyMatch[1];
      }
      
      // For Ultimate Guitar and similar sites, look for JSON data in script tags
      // They often store tab content in JavaScript variables
      const jsonDataMatch = html.match(/<script[^>]*>[\s\S]*?("content"|"tab"|"chords"|"lyrics")[\s\S]*?:[\s\S]*?("|')([^"']{50,})("|')/i);
      if (jsonDataMatch && jsonDataMatch[3]) {
        console.log('Found JSON data in script tag');
        extractedText = jsonDataMatch[3] + '\n\n';
      }
      
      // Remove all HTML tags but preserve line breaks
      text = text.replace(/<br\s*\/?>/gi, '\n');
      text = text.replace(/<\/p>/gi, '\n');
      text = text.replace(/<\/div>/gi, '\n');
      text = text.replace(/<\/li>/gi, '\n');
      text = text.replace(/<[^>]+>/g, '');
      
      // Decode HTML entities
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&hellip;/g, '...');
      
      // Clean up whitespace but preserve structure
      text = text
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
      
      if (!extractedText || extractedText.length < text.length) {
      extractedText = text;
      }
      console.log(`Extracted all text, length: ${extractedText.length} characters`);
    }
    
    // Final cleanup
    extractedText = extractedText
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .trim();
    
    if (!extractedText || extractedText.length < 20) {
      console.error('Extracted text is too short or empty');
      console.error('HTML preview (first 1000 chars):', html.substring(0, 1000));
      throw new Error('Could not extract meaningful content from webpage. The page might require JavaScript to load content.');
    }
    
    // If content is very large (>50k chars), try to extract just the tab portion
    if (extractedText.length > 50000) {
      console.log(`Content is very large (${extractedText.length} chars), attempting to extract tab section`);
      
      // Look for common tab indicators
      const tabIndicators = [
        /(?:\[Verse|\[Chorus|\[Bridge|\[Intro|\[Outro|VERSE|CHORUS|BRIDGE|INTRO|OUTRO)/i,
        /(?:Capo|Tuning|Tempo|Key:)/i,
        /(?:[A-G][#b]?m?\d*\/[A-G]|[A-G][#b]?m?\d*)/, // Chord patterns
      ];
      
      // Find the start of actual tab content
      let startIdx = 0;
      for (const indicator of tabIndicators) {
        const match = extractedText.match(indicator);
        if (match && match.index !== undefined) {
          startIdx = Math.max(0, match.index - 500); // Start a bit before
          console.log(`Found tab indicator, starting extraction at position ${startIdx}`);
          break;
        }
      }
      
      // Extract a reasonable chunk (max 30k chars) starting from tab content
      const maxLength = 30000;
      extractedText = extractedText.substring(startIdx, startIdx + maxLength);
      console.log(`Truncated to ${extractedText.length} characters starting from tab section`);
    }
    
    console.log(`Final extracted text length: ${extractedText.length} characters`);
    console.log(`Preview (first 200 chars): ${extractedText.substring(0, 200)}...`);
    
    return extractedText;
  } catch (error: any) {
    console.error('Error extracting text from URL:', error);
    throw new Error(`Failed to extract text from URL: ${error.message}`);
  }
}

// Check if URL is likely an image
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('image') ||
         !!lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i);
}

/**
 * Heuristic function to extract chords directly from text when API fails
 * Uses pattern matching to identify chords, lyrics, and sections
 * Handles Ultimate Guitar format with [tab] and [ch] tags
 */
function extractChordsFromText(text: string): ChordSheet {
  console.log('Extracting chords using heuristic patterns');
  
  // Clean up the text - decode HTML entities first
  let cleanText = text
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  
  // Extract title and artist (look for common patterns)
  let title = 'Untitled';
  let artist = 'Unknown';
  let language: 'he' | 'en' = 'en';
  let key: string | undefined;
  let capo: number | undefined;
  
  // Look for title patterns - Ultimate Guitar format often has "SONG_NAME (Artist Name)"
  const titleArtistMatch = cleanText.match(/^([A-Z][A-Z\s]+?)\s*\(([^)]+)\)/);
  if (titleArtistMatch) {
    title = titleArtistMatch[1].trim().substring(0, 255);
    artist = titleArtistMatch[2].trim().substring(0, 255);
  } else {
    // Try other patterns
    const titleMatch = cleanText.match(/(?:title|song|name)[:\s]+(.+?)(?:\n|$)/i) || 
                       cleanText.match(/^([A-Z][^\n\(]+?)(?:\s*\(|\s*\[|$)/);
    if (titleMatch) {
      title = titleMatch[1].trim().substring(0, 255);
    }
    
    // Look for artist patterns
    const artistMatch = cleanText.match(/(?:artist|by|performed by|singer)[:\s]+(.+?)(?:\n|$)/i) ||
                        cleanText.match(/\(([^)]+)\)/);
    if (artistMatch) {
      artist = artistMatch[1].trim().substring(0, 255);
    }
  }
  
  // Also try to extract from JSON data if available (Ultimate Guitar API format)
  try {
    const jsonMatch = cleanText.match(/"song_name"\s*:\s*"([^"]+)"/i);
    if (jsonMatch && (!title || title === 'Untitled')) {
      title = jsonMatch[1].trim().substring(0, 255);
    }
    
    const artistJsonMatch = cleanText.match(/"artist_name"\s*:\s*"([^"]+)"/i);
    if (artistJsonMatch && (!artist || artist === 'Unknown')) {
      artist = artistJsonMatch[1].trim().substring(0, 255);
    }
  } catch (e) {
    // Ignore JSON parsing errors
  }
  
  // Detect language (Hebrew has Hebrew characters)
  if (/[\u0590-\u05FF]/.test(cleanText)) {
    language = 'he';
  }
  
  // Look for key
  const keyMatch = cleanText.match(/(?:key|in|tonality_name)[:\s]+([A-G][#b]?m?)/i);
  if (keyMatch) {
    key = keyMatch[1];
  }
  
  // Look for capo
  const capoMatch = cleanText.match(/(?:capo|capo fret)[:\s]+(\d+)/i);
  if (capoMatch) {
    capo = parseInt(capoMatch[1], 10);
  }
  
  // Extract Ultimate Guitar tab content
  const tabMatches = cleanText.match(/\[tab\]([\s\S]*?)\[\/tab\]/gi);
  let tabContent = '';
  if (tabMatches) {
    tabContent = tabMatches.join('\n');
  } else {
    // If no [tab] tags, use the whole text
    tabContent = cleanText;
  }
  
  // Split into lines
  const lines = tabContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Chord pattern: matches [ch]Chord[/ch] or standalone chords
  // Improved pattern to properly match chords like Fmaj7, Am, G#dim, etc.
  const chordTagPattern = /\[ch\](.+?)\[\/ch\]/gi;
  // Better chord pattern: matches complete chord names including maj7, m7, dim, aug, etc.
  // Order matters: check for maj7/maj9 first, then m7/m9, then dim/aug, then simple m, then extensions
  const chordPattern = /\b([A-G][#b]?(?:maj[79]?|m[79]?|dim|aug|sus[24]?|add[2469])?(?:\d+)?(?:\/[A-G][#b]?)?)\b/gi;
  
  const sections: any[] = [];
  let currentSection: any = null;
  let currentLines: any[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a section header
    const sectionMatch = line.match(/^\[(verse|chorus|bridge|intro|outro|בית|פזמון|גשר|מבוא|סיום|VERSE|CHORUS|BRIDGE|INTRO|OUTRO)\s*(\d+)?\]/i);
    if (sectionMatch) {
      // Save previous section
      if (currentSection && currentLines.length > 0) {
        currentSection.lines = currentLines;
        sections.push(currentSection);
      }
      
      // Start new section
      const sectionType = sectionMatch[1].toLowerCase();
      const sectionNum = sectionMatch[2] || '';
      const sectionLabel = language === 'he' 
        ? (sectionType.includes('verse') || sectionType.includes('בית') ? `בית ${sectionNum || '1'}` : 
           sectionType.includes('chorus') || sectionType.includes('פזמון') ? 'פזמון' :
           sectionType.includes('bridge') || sectionType.includes('גשר') ? 'גשר' :
           sectionType.includes('intro') || sectionType.includes('מבוא') ? 'מבוא' : 'סיום')
        : `${sectionMatch[1].toUpperCase()} ${sectionNum || '1'}`;
      
      currentSection = {
        id: `sec-${sections.length + 1}`,
        type: sectionType.includes('verse') || sectionType.includes('בית') ? 'verse' :
              sectionType.includes('chorus') || sectionType.includes('פזמון') ? 'chorus' :
              sectionType.includes('bridge') || sectionType.includes('גשר') ? 'bridge' :
              sectionType.includes('intro') || sectionType.includes('מבוא') ? 'intro' : 'outro',
        label: sectionLabel,
        lines: []
      };
      currentLines = [];
      continue;
    }
    
    // Skip empty lines or lines that are just section markers
    if (!line || line.trim().length === 0 || line.match(/^\[.*\]$/)) {
      continue;
    }
    
    // Extract all chords (both from tags and standalone)
    const allChords: { chord: string; position: number }[] = [];
    
    // First, get chords from tags with their positions
    const tagMatches = Array.from(line.matchAll(chordTagPattern));
    for (const match of tagMatches) {
      allChords.push({ chord: match[1].trim(), position: match.index });
    }
    
    // Also find standalone chords
    const tempLine = line.replace(/\[ch\][^\]]*?\[\/ch\]/gi, ''); // Remove chord tags to find standalone
    const standaloneMatches = Array.from(tempLine.matchAll(chordPattern));
    for (const match of standaloneMatches) {
      // Only add if not already captured by a tag
      const alreadyFound = allChords.some(c => 
        Math.abs(c.position - match.index) < 5
      );
      if (!alreadyFound) {
        allChords.push({ chord: match[1], position: match.index });
      }
    }
    
    // Sort chords by position
    allChords.sort((a, b) => a.position - b.position);
    
    // Remove chord tags and extract lyrics
    let lyricsLine = line
      .replace(/\[ch\][^\]]*?\[\/ch\]/gi, '') // Remove chord tags
      .replace(/\[tab\]/gi, '')
      .replace(/\[\/tab\]/gi, '')
      .replace(/\|/g, '') // Remove bar separators
      .replace(/\r\n/g, ' ') // Remove line breaks
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\t/g, ' ') // Remove tabs
      .trim();
    
    // Clean up extra spaces
    lyricsLine = lyricsLine.replace(/\s+/g, ' ').trim();
    
    // Skip if line is empty after cleaning or is just chords
    if (!lyricsLine || lyricsLine.length === 0) {
      // If we have chords but no lyrics, this might be a chord-only line
      if (allChords.length > 0 && currentLines.length > 0) {
        // Attach chords to previous line
        const prevLine = currentLines[currentLines.length - 1];
        if (prevLine && prevLine.chords.every((c: string | Chord) => {
          if (typeof c === 'string') return !c || c === '';
          return false; // Chord objects are considered non-empty
        })) {
          const words = prevLine.lyrics.split(/\s+/).filter((w: string) => w.length > 0);
          const chordArray: (string | Chord)[] = new Array(words.length).fill('');
          
          // Distribute chords evenly across words
          allChords.forEach((cm, idx) => {
            const wordIndex = Math.floor((idx / allChords.length) * words.length);
            if (wordIndex < chordArray.length) {
              // Fix and parse chord
              const fixed = findClosestValidChord(cm.chord);
              const parsed = parseChord(fixed);
              chordArray[wordIndex] = parsed || fixed;
            }
          });
          
          prevLine.chords = chordArray;
        }
      }
      continue;
    }
    
    // Split lyrics into words
    const words = lyricsLine.split(/\s+/).filter(w => w.length > 0);
    
    // Map chords to words based on position
    const chordArray: (string | Chord)[] = new Array(words.length).fill('');
    
    if (allChords.length > 0) {
      // Calculate approximate word positions in original line
      let wordStart = 0;
      const wordPositions: number[] = [];
      for (const word of words) {
        const wordPos = lyricsLine.indexOf(word, wordStart);
        wordPositions.push(wordPos);
        wordStart = wordPos + word.length;
      }
      
      // Map chords to words based on position
      for (const chordInfo of allChords) {
        // Find the word closest to this chord position
        let closestWordIdx = 0;
        let minDistance = Infinity;
        
        for (let j = 0; j < wordPositions.length; j++) {
          const distance = Math.abs(wordPositions[j] - chordInfo.position);
          if (distance < minDistance) {
            minDistance = distance;
            closestWordIdx = j;
          }
        }
        
        // Assign chord to closest word (or next word if very close to end)
        if (minDistance < 20) { // Reasonable threshold
          // Fix and parse chord into Chord object
          const fixed = findClosestValidChord(chordInfo.chord);
          const parsed = parseChord(fixed);
          chordArray[closestWordIdx] = parsed || fixed;
        }
      }
    }
    
    // Add the line - parse chords into Chord objects
    currentLines.push({
      chords: chordArray.map(chord => {
        // Handle both string and Chord object
        if (typeof chord === 'string') {
          if (chord && chord.trim() !== '') {
            // Fix common issues and parse into Chord object
            const fixed = findClosestValidChord(chord);
            const parsed = parseChord(fixed);
            return parsed || fixed; // Return Chord object if parsed successfully, otherwise keep string
          }
          return '';
        }
        // Already a Chord object (from the mapping above)
        return chord;
      }),
      lyrics: lyricsLine
    });
  }
  
  // Add last section
  if (currentSection && currentLines.length > 0) {
    currentSection.lines = currentLines;
    sections.push(currentSection);
  }
  
  // If no sections found, create one default section
  if (sections.length === 0) {
    const allLines: any[] = [];
    
    for (const line of lines) {
      // Extract chords from [ch] tags
      const chordTags: string[] = [];
      const tagMatches = Array.from(line.matchAll(chordTagPattern));
      for (const match of tagMatches) {
        chordTags.push(match[1].trim());
      }
      
      // Extract lyrics
      let lyricsLine = line
        .replace(/\[ch\][^\]]*?\[\/ch\]/gi, '')
        .replace(/\[tab\]/gi, '')
        .replace(/\[\/tab\]/gi, '')
        .replace(/\|/g, '')
        .replace(/\r\n/g, ' ') // Remove line breaks
        .replace(/\r/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ') // Remove tabs
        .trim();
      
      // Clean up extra spaces
      lyricsLine = lyricsLine.replace(/\s+/g, ' ').trim();
      
      if (lyricsLine && lyricsLine.length > 0 && !lyricsLine.match(/^(title|artist|key|capo|verse|chorus|intro|outro|bridge)/i)) {
        const words = lyricsLine.split(/\s+/).filter(w => w.length > 0);
        const chords: (string | Chord)[] = new Array(words.length).fill('');
        
        // Distribute chords if we have them
        if (chordTags.length > 0) {
          chordTags.forEach((chord, idx) => {
            const wordIndex = Math.floor((idx / chordTags.length) * words.length);
            if (wordIndex < chords.length) {
              // Fix and parse chord
              const fixed = findClosestValidChord(chord);
              const parsed = parseChord(fixed);
              chords[wordIndex] = parsed || fixed;
            }
          });
        }
        
        allLines.push({ chords, lyrics: lyricsLine });
      }
    }
    
    if (allLines.length > 0) {
      sections.push({
        id: 'sec-1',
        type: 'verse',
        label: language === 'he' ? 'בית 1' : 'VERSE 1',
        lines: allLines
      });
    }
  }
  
  return {
    id: `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    artist,
    language,
    key,
    capo,
    sections: sections.length > 0 ? sections : [{
      id: 'sec-1',
      type: 'verse',
      label: language === 'he' ? 'בית 1' : 'VERSE 1',
      lines: []
    }],
    dateAdded: new Date().toISOString()
  };
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
    // Use gemini-2.5-flash (stable, supports vision, fast)
    // Alternative: gemini-2.5-pro (more capable but slower), gemini-2.0-flash-001, or gemini-flash-latest
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    let prompt = content[0].text;
    let imageData: { mimeType: string; data: string } | null = null;
    let extractedText = '';
    let originalExtractedText = ''; // Store original before chunking
    
    // Handle different input types
    if (url && !isImageUrl(url)) {
      // Webpage URL - extract text content
      extractedText = await extractTextFromUrl(url);
      originalExtractedText = extractedText; // Store original
      
      // If content is very large, try to find and extract just the relevant tab section
      if (extractedText.length > 20000) {
        console.log(`Content is large (${extractedText.length} chars), finding relevant tab section`);
        
        // Look for tab section markers
        const sectionMarkers = [
          /(?:\[Verse|\[Chorus|\[Bridge|\[Intro|\[Outro|VERSE|CHORUS|BRIDGE|INTRO|OUTRO)/i,
          /(?:Capo|Tuning|Tempo|Key:)/i,
        ];
        
        let startIdx = 0;
        let endIdx = extractedText.length;
        
        // Find start of tab content
        for (const marker of sectionMarkers) {
          const match = extractedText.match(marker);
          if (match && match.index !== undefined) {
            startIdx = Math.max(0, match.index - 200);
            console.log(`Found tab section start at position ${startIdx}`);
            break;
          }
        }
        
        // Look for end markers (comments, ads, etc.)
        const endMarkers = [
          /(?:\[Comments|\[Contributors|\[Report|\[Edit|Comments:|Contributors:)/i,
          /(?:Advertisement|Ad:|Sponsored)/i,
        ];
        
        for (const marker of endMarkers) {
          const match = extractedText.substring(startIdx).match(marker);
          if (match && match.index !== undefined) {
            endIdx = startIdx + match.index;
            console.log(`Found end marker at position ${endIdx}`);
            break;
          }
        }
        
        // Extract a reasonable chunk (max 15k chars for input, leaving room for prompt)
        const maxChunkSize = 15000;
        const chunkSize = Math.min(maxChunkSize, endIdx - startIdx);
        extractedText = extractedText.substring(startIdx, startIdx + chunkSize);
        console.log(`Extracted ${extractedText.length} char chunk from tab section`);
      }
      
      prompt += `\n\nChord sheet content extracted from webpage (${url}):\n\n${extractedText}`;
    } else if (textContent) {
      // Direct text content - also check for size
      let contentToUse = textContent;
      if (textContent.length > 20000) {
        console.log(`Text content is large (${textContent.length} chars), extracting relevant section`);
        // Similar chunking logic
        const sectionMarkers = [
          /(?:\[Verse|\[Chorus|\[Bridge|\[Intro|\[Outro|VERSE|CHORUS|BRIDGE|INTRO|OUTRO)/i,
          /(?:Capo|Tuning|Tempo|Key:)/i,
        ];
        
        let startIdx = 0;
        for (const marker of sectionMarkers) {
          const match = textContent.match(marker);
          if (match && match.index !== undefined) {
            startIdx = Math.max(0, match.index - 200);
            break;
          }
        }
        
        contentToUse = textContent.substring(startIdx, startIdx + 15000);
        console.log(`Using ${contentToUse.length} char chunk from text content`);
      }
      prompt += `\n\nChord sheet content to analyze:\n\n${contentToUse}`;
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
    // Try with JSON mode first, fallback to regular mode if needed
    let result;
    try {
      result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.3,
          maxOutputTokens: 16384, // Increased to handle very large chord sheets
        responseMimeType: 'application/json',
      },
    });
    } catch (jsonModeError: any) {
      // If JSON mode fails, try without it
      console.warn('JSON mode failed, trying without JSON mode:', jsonModeError.message);
      result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 16384, // Increased to handle very large chord sheets
        },
      });
    }

    const response = result.response;
    
    // Check for blocked or empty responses
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      const finishReason = response.promptFeedback?.blockReason || 'unknown';
      throw new Error(
        `Gemini response was blocked or empty. Finish reason: ${finishReason}. ` +
        `This might be due to safety filters or content policy violations.`
      );
    }
    
    // Check finish reason
    const finishReason = candidates[0].finishReason;
    const text = response.text();
    
    // If MAX_TOKENS but we have text, try to parse what we got
    if (finishReason === 'MAX_TOKENS' && text && text.trim().length > 0) {
      console.warn('Response was truncated (MAX_TOKENS), but attempting to parse partial response');
      console.warn(`Received ${text.length} characters before truncation`);
      // Continue to parsing - we'll try to extract what we can
    } else if (finishReason && finishReason !== 'STOP') {
      if (finishReason === 'MAX_TOKENS') {
        // Even if text is empty, try to get partial response
        if (text && text.trim().length > 0) {
          console.warn('Response was truncated (MAX_TOKENS), attempting to parse partial response');
          // Continue to parsing below
        } else {
          // No partial response - try heuristic extraction from input
          console.log('No partial response received, attempting heuristic extraction from input');
          const textToExtract = originalExtractedText || extractedText || textContent || '';
          if (textToExtract) {
            const heuristicSheet = extractChordsFromText(textToExtract);
            return validateAndFixChordSheet(heuristicSheet).sheet;
          }
          throw new Error(
            `Response was truncated due to token limit and no partial response was received. ` +
            `The chord sheet might be too complex. Try breaking it into smaller sections or simplifying the analysis.`
          );
        }
      } else {
        throw new Error(
          `Gemini response finished with reason: ${finishReason}. ` +
          `This might indicate the response was blocked or truncated.`
        );
      }
    }
    
    if (!text || text.trim().length === 0) {
      console.error('Empty response from Gemini. Full response:', JSON.stringify(response, null, 2));
      throw new Error(
        `No response text from Gemini. Finish reason: ${finishReason || 'unknown'}. ` +
        `The model might have been blocked by safety filters.`
      );
    }

    // Parse the JSON response
    // Gemini may wrap JSON in markdown code blocks, so clean it up
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    }
    
    // If response was truncated, try to fix incomplete JSON
    const wasTruncated = finishReason === 'MAX_TOKENS';
    if (wasTruncated) {
      console.log('Fixing incomplete JSON from truncated response');
      // Try to close any open JSON structures
      let openBraces = (jsonText.match(/\{/g) || []).length;
      let closeBraces = (jsonText.match(/\}/g) || []).length;
      let openBrackets = (jsonText.match(/\[/g) || []).length;
      let closeBrackets = (jsonText.match(/\]/g) || []).length;
      
      // Close arrays first, then objects
      while (openBrackets > closeBrackets) {
        jsonText += ']';
        closeBrackets++;
      }
      while (openBraces > closeBraces) {
        jsonText += '}';
        closeBraces++;
      }
      
      // If we're in the middle of a string, try to close it
      // Count unescaped quotes (simple approach - count all quotes)
      const quoteMatches = jsonText.match(/"/g);
      if (quoteMatches && quoteMatches.length % 2 !== 0) {
        // Odd number of quotes means we're likely in the middle of a string
        jsonText += '"';
      }
    }
    
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError: any) {
      // If JSON parsing fails, log the text for debugging
      console.error('Failed to parse JSON response:', parseError.message);
      console.error('Response text (first 500 chars):', jsonText.substring(0, 500));
      
      if (wasTruncated) {
        // For truncated responses, try to extract what we can
        console.log('Attempting to extract partial data from truncated JSON');
        
        // Try to extract at least title and artist
        const titleMatch = jsonText.match(/"title"\s*:\s*"([^"]*)"/i);
        const artistMatch = jsonText.match(/"artist"\s*:\s*"([^"]*)"/i);
        const languageMatch = jsonText.match(/"language"\s*:\s*"([^"]*)"/i);
        
        // Try to extract sections array
        const sectionsMatch = jsonText.match(/"sections"\s*:\s*\[([\s\S]*?)(?:\]|$)/i);
        
        if (titleMatch || artistMatch) {
          // Create a minimal valid response
          parsed = {
            title: titleMatch ? titleMatch[1] : 'Untitled',
            artist: artistMatch ? artistMatch[1] : 'Unknown',
            language: languageMatch ? languageMatch[1] : 'en',
            sections: [] as Array<{ id: string; type: string; label: string; lines: any[] }>,
          };
          
          // Try to parse sections if found
          if (sectionsMatch && sectionsMatch[1]) {
            try {
              // Try to extract individual sections
              const sectionMatches = sectionsMatch[1].matchAll(/\{[^}]*"type"\s*:\s*"([^"]*)"[^}]*"label"\s*:\s*"([^"]*)"[^}]*\}/gi);
              const sections: Array<{ id: string; type: string; label: string; lines: any[] }> = [];
              for (const match of sectionMatches) {
                sections.push({
                  id: `sec-${sections.length + 1}`,
                  type: match[1] || 'verse',
                  label: match[2] || '',
                  lines: [],
                });
              }
              if (sections.length > 0) {
                parsed.sections = sections;
              }
            } catch (e) {
              // Ignore section parsing errors
            }
          }
          
          console.log('Extracted partial data from truncated response:', parsed);
        } else {
          // If we can't extract partial data, try heuristic extraction from input
          console.log('Attempting heuristic extraction from input text');
          const textToExtract = originalExtractedText || extractedText || textContent || '';
          if (textToExtract) {
            const heuristicSheet = extractChordsFromText(textToExtract);
            return validateAndFixChordSheet(heuristicSheet).sheet;
          }
          throw new Error(
            `Failed to parse JSON response from Gemini. ` +
            `Response was truncated (MAX_TOKENS). ` +
            `Error: ${parseError.message}`
          );
        }
      } else {
        throw new Error(
          `Failed to parse JSON response from Gemini. ` +
          `Error: ${parseError.message}`
        );
      }
    }
    
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
        lines: (sec.lines || []).map((line: any) => {
          // Debug: log what we're receiving from Gemini
          if (line.chords && Array.isArray(line.chords)) {
            console.log('Gemini chords for line:', line.chords, 'Type check:', line.chords.map((c: any) => typeof c));
          }
          
          return {
            chords: Array.isArray(line.chords) 
              ? line.chords.map((c: any) => {
                  // Handle different input types from Gemini
                  let chordStr: string;
                  
                  // If it's already a string, use it directly
                  if (typeof c === 'string') {
                    chordStr = c.trim();
                  } 
                  // If it's a Chord object (unlikely from Gemini, but handle it)
                  else if (c && typeof c === 'object' && 'note' in c) {
                    chordStr = chordToString(c);
                  }
                  // If it's an array (shouldn't happen, but handle it)
                  else if (Array.isArray(c)) {
                    console.warn('Unexpected array in chords:', c);
                    chordStr = c.join(''); // Join array elements
                  }
                  // Otherwise convert to string
                  else {
                    chordStr = String(c || '').trim();
                  }
                  
                  if (!chordStr || chordStr === '') return '';
                  
                  // Fix invalid chords and parse into Chord object
                  const fixed = findClosestValidChord(chordStr);
                  const parsed = parseChord(fixed);
                  
                  // Debug: log if chord was changed
                  if (fixed !== chordStr) {
                    console.log(`Fixed chord: "${chordStr}" → "${fixed}"`);
                  }
                  
                  return parsed || fixed; // Return Chord object if parsed successfully, otherwise string
                })
              : [],
            lyrics: line.lyrics || ''
          };
        })
      })),
      dateAdded: new Date().toISOString().split('T')[0],
    };

    // Validate and fix chord names
    const { sheet: validatedSheet, fixes } = validateAndFixChordSheet(sheet);
    
    if (fixes.length > 0) {
      console.log(`Fixed ${fixes.length} invalid chord(s):`, fixes.slice(0, 5));
      if (fixes.length > 5) {
        console.log(`... and ${fixes.length - 5} more`);
      }
    }

    return validatedSheet;
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
    
    // Check for model not found errors
    if (
      errorStatus === 404 ||
      errorMessage.toLowerCase().includes('not found') ||
      errorMessage.toLowerCase().includes('is not found for api version') ||
      errorMessage.toLowerCase().includes('is not supported')
    ) {
      throw new Error(
        `Model not found or not supported. The model name may have changed. ` +
        `Try: 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-001', or 'gemini-flash-latest'. ` +
        `Check https://ai.google.dev/models/gemini for the latest available models. ` +
        `Original error: ${error.message || error}`
      );
    }
    
    throw new Error(`Failed to analyze chord sheet: ${error.message || error}`);
  }
}

