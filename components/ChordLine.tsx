'use client';

import { ChordLine as ChordLineType } from '@/types';

interface ChordLineProps {
  line: ChordLineType;
  rtl?: boolean;
}

export default function ChordLine({ line, rtl = false }: ChordLineProps) {
  const { chords, lyrics } = line;
  
  // Calculate positions for chords based on lyrics
  const chordPositions: Array<{ chord: string; position: number }> = [];
  let currentPos = 0;
  
  // For RTL, we need to handle differently
  if (rtl) {
    // For Hebrew, chords are still positioned from left, but text flows RTL
    chords.forEach((chord, idx) => {
      if (chord) {
        // Approximate position - in RTL, we count from right
        const charCount = lyrics.slice(0, idx).length;
        chordPositions.push({ chord, position: charCount });
      }
    });
  } else {
    // For LTR, position chords based on character count
    chords.forEach((chord, idx) => {
      if (chord) {
        const charCount = lyrics.slice(0, idx).length;
        chordPositions.push({ chord, position: charCount });
      }
    });
  }

  // Create chord line with spaces
  const maxLength = Math.max(lyrics.length, chordPositions.length > 0 ? Math.max(...chordPositions.map(cp => cp.position + cp.chord.length)) : 0);
  const chordLine = Array(maxLength).fill(' ');
  
  chordPositions.forEach(({ chord, position }) => {
    for (let i = 0; i < chord.length && position + i < maxLength; i++) {
      chordLine[position + i] = chord[i];
    }
  });

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="font-mono">
      <div dir="ltr" className="text-yellow-400 font-semibold leading-tight mb-1">
        {chordLine.join('')}
      </div>
      <div className="text-white leading-relaxed">
        {lyrics}
      </div>
    </div>
  );
}

