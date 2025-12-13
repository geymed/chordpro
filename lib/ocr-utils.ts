import { ChordSheet, ChordSection, ChordLine } from '@/types';

/**
 * Detects if a line is likely a chord line
 */
function isChordLine(line: string): boolean {
    // Common chord patterns - more comprehensive (digits are optional)
    const chordPattern = /\b[A-G](#|b)?(m(?:aj|in|aj7)?|maj|min|aug|dim|sus[24]?|add[2469]|M)?\d*(\/[A-G](#|b)?)?\b/gi;
    const chords = line.match(chordPattern) || [];
    const words = line.trim().split(/\s+/).filter(w => w.trim());

    // If the line is empty, it's not a chord line
    if (words.length === 0) return false;

    // Heuristic: If a significant portion of "words" look like chords, it's a chord line
    // Or if it has chords and very few other words
    const chordCount = chords.length;
    const wordCount = words.length;

    // More lenient: if at least 30% are chords, or if there are chords and few non-chord words
    return chordCount > 0 && (chordCount / wordCount >= 0.3 || wordCount - chordCount <= 3);
}

/**
 * Extracts chord positions from a chord line
 * Returns an array of { chord: string, startPos: number, endPos: number }
 */
function extractChordPositions(chordLine: string): Array<{ chord: string; startPos: number; endPos: number }> {
    // More comprehensive chord pattern - digits are optional
    const chordPattern = /\b([A-G](#|b)?(m(?:aj|in|aj7)?|maj|min|aug|dim|sus[24]?|add[2469]|M)?\d*(\/[A-G](#|b)?)?)\b/gi;
    const positions: Array<{ chord: string; startPos: number; endPos: number }> = [];
    let match;

    while ((match = chordPattern.exec(chordLine)) !== null) {
        positions.push({
            chord: match[1],
            startPos: match.index,
            endPos: match.index + match[0].length
        });
    }

    return positions;
}

/**
 * Normalizes spacing in a line by collapsing multiple spaces
 */
function normalizeSpacing(line: string): string {
    return line.replace(/\s+/g, ' ').trim();
}

/**
 * Detects if text is RTL (Right-to-Left) like Hebrew
 */
function isRTL(text: string): boolean {
    return /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Matches chords to words using a smarter alignment algorithm
 * Accounts for OCR spacing issues and aligns chords proportionally
 * Handles RTL text correctly
 */
function matchChordsToWords(chordLine: string, lyricLine: string): Array<{ word: string; chord?: string }> {
    // Normalize spacing first
    const normalizedChordLine = normalizeSpacing(chordLine);
    const normalizedLyricLine = normalizeSpacing(lyricLine);
    
    // Check if text is RTL
    const isRTLText = isRTL(normalizedLyricLine);
    
    // Extract chords and words
    const chordPositions = extractChordPositions(normalizedChordLine);
    const words = normalizedLyricLine.split(/\s+/).filter(w => w.trim());
    
    if (chordPositions.length === 0 || words.length === 0) {
        // No chords or no words - return words without chords
        return words.map(word => ({ word }));
    }
    
    // Calculate proportional positions
    const chordLineLength = normalizedChordLine.length;
    const lyricLineLength = normalizedLyricLine.length;
    
    // Build word positions with normalized coordinates
    const wordPositions: Array<{ word: string; startNorm: number; endNorm: number; originalIndex: number }> = [];
    let currentPos = 0;
    
    words.forEach((word, wordIndex) => {
        const startPos = normalizedLyricLine.indexOf(word, currentPos);
        if (startPos !== -1) {
            const endPos = startPos + word.length;
            wordPositions.push({
                word,
                startNorm: startPos / lyricLineLength,
                endNorm: endPos / lyricLineLength,
                originalIndex: wordIndex
            });
            currentPos = endPos;
        } else {
            // Fallback: estimate position
            const estimatedStart = currentPos;
            const estimatedEnd = estimatedStart + word.length;
            wordPositions.push({
                word,
                startNorm: estimatedStart / lyricLineLength,
                endNorm: estimatedEnd / lyricLineLength,
                originalIndex: wordIndex
            });
            currentPos = estimatedEnd + 1;
        }
    });
    
    // Normalize chord positions (keep original positions, don't invert)
    const normalizedChordPositions = chordPositions.map(({ chord, startPos, endPos }, chordIndex) => ({
        chord,
        startNorm: startPos / chordLineLength,
        endNorm: endPos / chordLineLength,
        centerNorm: (startPos + endPos) / 2 / chordLineLength,
        originalIndex: chordIndex
    }));
    
    // For RTL: Reverse both arrays so we match rightmost-to-rightmost
    // In RTL, both chords and words are extracted left-to-right but displayed right-to-left
    // So we reverse both to match them correctly
    const chordsForMatching = isRTLText 
        ? [...normalizedChordPositions].reverse()
        : normalizedChordPositions;
    
    const wordsForMatching = isRTLText
        ? [...wordPositions].reverse()
        : wordPositions;
    
    // Match chords to words using proportional alignment
    // Use a stricter approach: only match when there's clear alignment
    const matches: Array<{ wordIndex: number; chordIndex: number; score: number }> = [];
    
    wordsForMatching.forEach(({ originalIndex: wordIndex, startNorm, endNorm }) => {
        const wordCenterNorm = (startNorm + endNorm) / 2;
        const wordWidthNorm = endNorm - startNorm;
        
        let bestChordIdx = -1;
        let bestScore = -Infinity;
        
        // Find the best matching chord
        chordsForMatching.forEach(({ chord, startNorm: chordStartNorm, endNorm: chordEndNorm, centerNorm, originalIndex: chordIndex }) => {
            // Calculate overlap
            const overlap = Math.max(0, Math.min(endNorm, chordEndNorm) - Math.max(startNorm, chordStartNorm));
            const distance = Math.abs(centerNorm - wordCenterNorm);
            
            // Require significant overlap OR very close alignment
            const chordWidthNorm = chordEndNorm - chordStartNorm;
            const minWidth = Math.min(wordWidthNorm, chordWidthNorm);
            const overlapRatio = overlap / (minWidth || 0.01);
            
            // Stricter matching criteria
            // For RTL, we need even stricter matching since positions are inverted
            const minOverlapRatio = isRTLText ? 0.5 : 0.3; // Require 50% overlap for RTL
            const maxDistance = isRTLText ? wordWidthNorm * 0.3 : wordWidthNorm * 0.5; // Tighter distance for RTL
            
            const hasGoodOverlap = overlapRatio > minOverlapRatio;
            const isVeryClose = distance < maxDistance;
            
            if (hasGoodOverlap || isVeryClose) {
                // Score: prioritize overlap, penalize distance more heavily for RTL
                const overlapWeight = isRTLText ? 5 : 3;
                const distanceWeight = isRTLText ? 30 : 20;
                const overlapScore = overlapRatio * overlapWeight;
                const proximityScore = (1 / (1 + distance * distanceWeight)) * 2;
                const score = overlapScore + proximityScore;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestChordIdx = chordIndex;
                }
            }
        });
        
        // Only record match if we found a good one
        // Higher threshold for RTL to avoid false matches
        const minScore = isRTLText ? 2.0 : 1.0;
        if (bestChordIdx !== -1 && bestScore > minScore) {
            matches.push({ wordIndex, chordIndex: bestChordIdx, score: bestScore });
        }
    });
    
    // Sort matches by score (best first) and assign chords without conflicts
    matches.sort((a, b) => b.score - a.score);
    const assignedChords = new Map<number, string>(); // wordIndex -> chord
    const usedChords = new Set<number>();
    
    matches.forEach(({ wordIndex, chordIndex, score }) => {
        if (!usedChords.has(chordIndex) && !assignedChords.has(wordIndex)) {
            // For RTL, chordIndex refers to reversed array, need to get original index
            const originalChordIndex = isRTLText 
                ? normalizedChordPositions.length - 1 - chordIndex
                : chordIndex;
            assignedChords.set(wordIndex, normalizedChordPositions[originalChordIndex].chord);
            usedChords.add(chordIndex);
        }
    });
    
    // Build result array maintaining original word order
    const result: Array<{ word: string; chord?: string }> = [];
    wordPositions.forEach(({ word, originalIndex }) => {
        result.push({
            word,
            chord: assignedChords.get(originalIndex)
        });
    });
    
    return result;
}

/**
 * Detects if a line looks like a title or artist name
 */
function isTitleOrArtist(line: string, lineIndex: number): boolean {
    // Usually in first few lines
    if (lineIndex > 3) return false;
    
    // Check for common patterns:
    // - All caps or title case
    // - No chords (very few chord-like patterns)
    // - Not too long (titles/artists are usually short)
    // - May contain common words like "by", "from", etc.
    
    const hasChords = isChordLine(line);
    const isLong = line.length > 60;
    const hasBy = /\b(by|from|artist|song|title)\b/i.test(line);
    const isTitleCase = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(line);
    const isAllCaps = /^[A-Z\s]+$/.test(line) && line.length < 50;
    
    return !hasChords && !isLong && (hasBy || isTitleCase || isAllCaps);
}

/**
 * Extracts title and artist from the beginning of the text
 */
function extractTitleAndArtist(lines: string[]): { title: string; artist: string; startIndex: number } {
    let title = 'Untitled Song';
    let artist = 'Unknown Artist';
    let startIndex = 0;
    
    // Look at first 3-4 lines for title/artist
    for (let i = 0; i < Math.min(4, lines.length); i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Skip if it's a section header
        if (line.match(/^\[?((?:Verse|Chorus|Bridge|Intro|Outro|Solo|Instrumental).*?)\]?:?$/i)) {
            startIndex = i;
            break;
        }
        
        // Skip if it's a chord line (probably intro)
        if (isChordLine(line)) {
            startIndex = i;
            break;
        }
        
        // Check for "by" pattern: "Song Title by Artist Name"
        const byMatch = line.match(/^(.+?)\s+by\s+(.+)$/i);
        if (byMatch) {
            title = byMatch[1].trim();
            artist = byMatch[2].trim();
            startIndex = i + 1;
            break;
        }
        
        // First non-empty line is usually title
        if (title === 'Untitled Song' && line.length > 0 && line.length < 60) {
            title = line;
            startIndex = i + 1;
            continue;
        }
        
        // Second non-empty line might be artist
        if (title !== 'Untitled Song' && artist === 'Unknown Artist' && line.length > 0 && line.length < 60) {
            artist = line;
            startIndex = i + 1;
            break;
        }
    }
    
    return { title, artist, startIndex };
}

/**
 * Processes raw OCR text into a structured ChordSheet object
 */
export function processOCRText(text: string): Partial<ChordSheet> {
    const lines = text.split('\n');
    
    // Extract title and artist from beginning
    const { title, artist, startIndex } = extractTitleAndArtist(lines);
    
    const sections: ChordSection[] = [];
    let currentSection: ChordSection | null = null;
    let sectionCounter = 0;
    let isInIntro = false;

    // Start processing from after title/artist
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Check for section headers (e.g., [Chorus], Chorus:, VERSE 1, Intro)
        const sectionMatch = line.match(/^\[?((?:Verse|Chorus|Bridge|Intro|Outro|Solo|Instrumental).*?)\]?:?$/i);

        if (sectionMatch) {
            // Push previous section if it has content
            if (currentSection && currentSection.lines.length > 0) {
                sections.push(currentSection);
            }

            // Start new section
            sectionCounter++;
            const sectionLabel = sectionMatch[1];
            isInIntro = /^Intro/i.test(sectionLabel);
            
            currentSection = {
                id: `section-${sectionCounter}`,
                label: sectionLabel,
                lines: []
            };
            continue;
        }

        // Initialize section if we don't have one yet
        if (!currentSection) {
            sectionCounter++;
            currentSection = {
                id: `section-${sectionCounter}`,
                label: 'Verse',
                lines: []
            };
        }

        // Process regular lines
        if (isChordLine(line)) {
            // It's a chord line. Look ahead for lyrics.
            const nextLine = lines[i + 1]?.trim();

            if (nextLine && !isChordLine(nextLine) && !nextLine.match(/^\[?((?:Verse|Chorus|Bridge|Intro|Outro).*?)\]?:?$/i)) {
                // We have lyrics on the next line - this is a normal word-chord line
                const lyrics = nextLine;
                i++; // Skip next line since we consumed it

                // Use position-based matching for better accuracy
                const words = matchChordsToWords(line, lyrics);

                currentSection.lines.push({ words });
            } else {
                // Chord line without lyrics
                // If we're in an intro section or this looks like intro, keep as chord-only
                // Otherwise, skip it (might be misidentified)
                if (isInIntro || currentSection.label.toLowerCase().includes('intro')) {
                    const chordPositions = extractChordPositions(line);
                    const words = chordPositions.map(({ chord }) => ({ word: '', chord }));
                    
                    // If no chords found, try simple split as fallback
                    if (words.length === 0) {
                const chordWords = line.split(/\s+/).filter(w => w.trim());
                        // Check if words look like chords
                        const chordPattern = /\b[A-G](#|b)?(m(?:aj|in|aj7)?|maj|min|aug|dim|sus[24]?|add[2469]|M)?\d*(\/[A-G](#|b)?)?\b/gi;
                        words.push(...chordWords.filter(w => chordPattern.test(w)).map(chord => ({ word: '', chord })));
                    }
                    
                    if (words.length > 0) {
                        currentSection.lines.push({ words });
                    }
                }
                // Skip chord-only lines outside of intro sections
            }
        } else {
            // It's a lyric line - check if previous line was a chord line
            const prevLine = i > 0 ? lines[i - 1]?.trim() : null;
            
            if (prevLine && isChordLine(prevLine)) {
                // Previous line was chords, use position-based matching
                const words = matchChordsToWords(prevLine, line);
                // Replace the previous line's entry with this matched version
                if (currentSection.lines.length > 0) {
                    const lastLineIdx = currentSection.lines.length - 1;
                    currentSection.lines[lastLineIdx] = { words };
                } else {
                currentSection.lines.push({ words });
            }
        } else {
            // It's a lyric line with no chords above it
            const lyricWords = line.split(/\s+/).filter(w => w.trim());
            const words = lyricWords.map(word => ({ word }));
            currentSection.lines.push({ words });
            }
        }
    }

    // Push final section
    if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection);
    }

    return {
        title,
        artist,
        sections
    };
}
