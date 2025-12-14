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

        // Check for section headers - support both bracket format [Intro] and plain format "Intro:"
        const trimmedLine = currentLine.trim();
        let sectionLabel: string | null = null;
        
        // Try bracket format: [Intro], [Verse 1], etc.
        const bracketMatch = trimmedLine.match(/^\[(.*?)\]$/);
        if (bracketMatch && bracketMatch[1]) {
            sectionLabel = bracketMatch[1];
        } else {
            // Try plain format: "Intro:", "Verse 1:", etc.
            if (trimmedLine.endsWith(':') || ['Chorus', 'Verse', 'Bridge', 'Intro', 'Outro'].some(word => 
                trimmedLine.toLowerCase().startsWith(word.toLowerCase())
            )) {
                sectionLabel = trimmedLine.replace(':', '').trim();
            }
        }
        
        if (sectionLabel) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/df55eda9-872a-4822-90aa-20cfdc31835e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/analysis/chord-parser.ts:48',message:'Section header detected',data:{sectionLabel,line:trimmedLine},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
            if (currentSection.lines.length > 0) {
                sections.push(currentSection);
            }
            const lowerLabel = sectionLabel.toLowerCase();
            let sectionType: 'verse' | 'chorus' | 'bridge' = 'verse';
            if (lowerLabel.includes('chorus')) sectionType = 'chorus';
            else if (lowerLabel.includes('bridge')) sectionType = 'bridge';
            
            currentSection = {
                id: `section-${sections.length + 1}`,
                label: sectionLabel, // sectionLabel is guaranteed to be non-null here
                type: sectionType,
                lines: []
            };
            continue;
        }

        if (isChordLine(currentLine)) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/df55eda9-872a-4822-90aa-20cfdc31835e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/analysis/chord-parser.ts:61',message:'Chord line detected',data:{line:currentLine.substring(0,50),hasNextLine:!!nextLine,nextIsChordLine:nextLine ? isChordLine(nextLine) : false,currentSection:currentSection.label},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            // It's a chord line. Check if next line is lyrics.
            if (nextLine && !isChordLine(nextLine) && nextLine.trim()) {
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
                // Just chords (instrumental line) - chord-only line like intro
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/df55eda9-872a-4822-90aa-20cfdc31835e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/analysis/chord-parser.ts:120',message:'Chord-only line detected',data:{line:currentLine.substring(0,50),section:currentSection.label},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                
                // Extract chords - handle both plain format "D C E" and [ch]D[/ch] format
                let chordLine = currentLine.trim();
                // Remove [ch] and [/ch] tags if present
                chordLine = chordLine.replace(/\[\/?ch\]/g, '').trim();
                
                // Split by whitespace and filter out empty strings
                const tokens = chordLine.split(/\s+/).filter(t => t.trim());
                
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/df55eda9-872a-4822-90aa-20cfdc31835e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/analysis/chord-parser.ts:128',message:'Extracted chords from chord-only line',data:{chords:tokens,count:tokens.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                
                if (tokens.length > 0) {
                    currentSection.lines.push({
                        words: tokens.map(c => ({ word: '', chord: c }))
                    });
                }
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
