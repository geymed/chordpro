'use client';

import { ChordLine as ChordLineType } from '@/types';

interface ChordLineProps {
  line: ChordLineType;
  rtl?: boolean;
}

export default function ChordLine({ line, rtl = false }: ChordLineProps) {
  const { chords, lyrics } = line;
  
  // Split lyrics into words and spaces, preserving the structure
  const parts = lyrics.split(/(\s+)/);
  
  // Build chord line character by character, matching the lyrics structure
  const chordLineChars: string[] = [];
  let chordIndex = 0;
  
  parts.forEach((part) => {
    // If this is whitespace, preserve it in the chord line
    if (/^\s+$/.test(part)) {
      chordLineChars.push(...part.split(''));
      return;
    }
    
    // This is a word - get its chord (if available)
    const chord = chordIndex < chords.length ? chords[chordIndex] : '';
    
    if (chord && chord.trim() !== '') {
      // Place the chord above the word
      const wordLength = part.length;
      const chordLength = chord.length;
      
      // Place chord characters, then pad with spaces to match word length
      for (let i = 0; i < wordLength; i++) {
        if (i < chordLength) {
          chordLineChars.push(chord[i]);
        } else {
          chordLineChars.push(' ');
        }
      }
    } else {
      // No chord for this word - fill with spaces to maintain alignment
      chordLineChars.push(...part.split('').map(() => ' '));
    }
    
    // Move to next chord (only for non-whitespace parts)
    chordIndex++;
  });
  
  const chordLine = chordLineChars.join('');

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="font-mono whitespace-pre">
      <div dir={rtl ? 'rtl' : 'ltr'} className="text-yellow-400 font-semibold leading-tight mb-1">
        {chordLine}
      </div>
      <div className="text-white leading-relaxed whitespace-pre">
        {lyrics}
      </div>
    </div>
  );
}

