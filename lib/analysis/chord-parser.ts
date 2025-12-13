import { ChordSheet, ChordSection, ChordLine, ChordWord } from '@/types';

/**
 * Parses reconstructed grid text into a structured ChordSheet
 */
export function parseGridTextToChordSheet(text: string): ChordSheet {
    const lines = text.split('\n');
    const sections: ChordSection[] = [];
    let currentSection: ChordSection = {
        id: 'section-0',
        label: 'Verse',
        type: 'verse',
        lines: []
    };

    // Helper to check if a line is predominantly chords
    const isChordLine = (line: string): boolean => {
        const trimmed = line.trim();
        if (!trimmed) return false;

        const words = trimmed.split(/\s+/);
        const chordRegex = /^[A-G][b#]?(m|min|maj|dim|aug|sus|add|2|4|5|6|7|9|11|13)*(\/[A-G][b#]?)?$/;

        const chordCount = words.filter(w => chordRegex.test(w)).length;
        return (chordCount / words.length) > 0.4; // Threshold for chord line detection
    };

    // Helper to reverse Hebrew words in a line
    const reverseHebrewWords = (text: string): string => {
        // Split by spaces to get words
        return text.split(/(\s+)/).map(part => {
            // Check if word contains Hebrew
            if (/[\u0590-\u05FF]/.test(part)) {
                // Reverse the characters in the Hebrew word
                return part.split('').reverse().join('');
            }
            return part;
        }).join('');
    };

    for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];
        const nextLine = lines[i + 1];

        if (!currentLine.trim()) continue;

        // Check for section headers (simple heuristic)
        if (currentLine.trim().endsWith(':') || ['Chorus', 'Verse', 'Bridge'].includes(currentLine.trim())) {
            if (currentSection.lines.length > 0) {
                sections.push(currentSection);
            }
            currentSection = {
                id: `section-${sections.length + 1}`,
                label: currentLine.replace(':', '').trim(),
                type: currentLine.toLowerCase().includes('chorus') ? 'chorus' : 'verse',
                lines: []
            };
            continue;
        }

        if (isChordLine(currentLine)) {
            // It's a chord line. Check if next line is lyrics.
            if (nextLine && !isChordLine(nextLine)) {
                // Merge Chords + Lyrics
                const chordLine = currentLine;
                // Apply Hebrew reversal to the lyric line
                const lyricLine = reverseHebrewWords(nextLine);

                const mergedLine: ChordLine = { words: [] };

                // We iterate through the lyric line and find chords above
                // Since we have preserved spacing, we can use indices

                // Tokenize lyrics by space, but keep track of start/end indices
                const lyricTokens: { text: string, start: number, end: number }[] = [];
                let currentWord = '';
                let startIndex = -1;

                for (let j = 0; j < lyricLine.length; j++) {
                    const char = lyricLine[j];
                    if (char !== ' ') {
                        if (startIndex === -1) startIndex = j;
                        currentWord += char;
                    } else {
                        if (currentWord) {
                            lyricTokens.push({ text: currentWord, start: startIndex, end: j });
                            currentWord = '';
                            startIndex = -1;
                        }
                    }
                }
                if (currentWord) {
                    lyricTokens.push({ text: currentWord, start: startIndex, end: lyricLine.length });
                }

                // Now find chords for each word
                lyricTokens.forEach(token => {
                    // Look for chords in the range [start-margin, end+margin]
                    // We look a bit wider to catch chords that are slightly offset
                    const margin = 2;
                    const searchStart = Math.max(0, token.start - margin);
                    const searchEnd = Math.min(chordLine.length, token.end + margin);

                    const chordSlice = chordLine.substring(searchStart, searchEnd).trim();

                    // If we found something that looks like a chord
                    const foundChord = chordSlice.split(/\s+/).find(w => w.length > 0);

                    mergedLine.words.push({
                        word: token.text,
                        chord: foundChord || undefined
                    });
                });

                // Check for orphan chords (chords with no lyrics below)
                // This is a simplified implementation; robust one would track used chords

                currentSection.lines.push(mergedLine);
                i++; // Skip next line since we consumed it
            } else {
                // Just chords (instrumental line)
                const tokens = currentLine.trim().split(/\s+/);
                currentSection.lines.push({
                    words: tokens.map(c => ({ word: '', chord: c }))
                });
            }
        } else {
            // Just lyrics
            const tokens = currentLine.trim().split(/\s+/);
            currentSection.lines.push({
                words: tokens.map(w => ({ word: w, chord: undefined }))
            });
        }
    }

    if (currentSection.lines.length > 0) {
        sections.push(currentSection);
    }

    return {
        id: Date.now().toString(),
        title: 'Analyzed Sheet',
        artist: 'Unknown',
        key: '',
        sections,
        dateAdded: new Date().toISOString(),
        language: 'he' // Default to Hebrew for now as that's the use case
    };
}
