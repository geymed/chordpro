'use client';

import { useState } from 'react';
import { ChordLine as ChordLineType } from '@/types';


interface ChordLineProps {
  line: ChordLineType;
  rtl?: boolean;
  editable?: boolean;
  onLineChange?: (updatedLine: ChordLineType) => void;
}

export default function ChordLine({ line, rtl = false, editable = false, onLineChange }: ChordLineProps) {
  const { words } = line;
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Use original words array for editing callbacks (to maintain indices)
  const originalWords = words;

  const handleWordChange = (index: number, newWord: string) => {
    if (!onLineChange) return;

    const updatedWords = [...words];
    updatedWords[index] = { ...updatedWords[index], word: newWord };
    onLineChange({ ...line, words: updatedWords });
  };

  const handleChordChange = (index: number, newChord: string) => {
    if (!onLineChange) return;

    const updatedWords = [...words];
    updatedWords[index] = { ...updatedWords[index], chord: newChord };
    onLineChange({ ...line, words: updatedWords });
  };

  // Helper function to check if a string is likely a chord (not a word)
  const isChordPattern = (text: string): boolean => {
    if (!text) return false;
    const trimmed = text.trim();
    // Single numbers or very short patterns that look like chords
    if (/^\d+$/.test(trimmed)) return true; // Just numbers like "6"
    if (trimmed.length <= 2 && /^[A-G][#b]?[m]?$/.test(trimmed)) return true; // Very short chord patterns
    // Common chord patterns
    if (/^[A-G][#b]?[m]?(?:aj|in|dim|aug|sus[24]?|add[2469]|maj|min)?(?:\d+|\([^)]+\))?(?:\/[A-G][#b]?)?$/i.test(trimmed)) return true;
    return false;
  };

  // Filter out empty words, clean Unicode direction marks, and filter out chords
  const cleanWords = words
    .map(w => ({
      ...w,
      word: w.word ? w.word.replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '').trim() : ''
    }))
    .filter(w => {
      // Keep words that have content and are not chord patterns
      return w.word.length > 0 && !isChordPattern(w.word);
    });

  // Check if this line actually contains Hebrew text
  const hasHebrew = cleanWords.some(w => /[\u0590-\u05FF]/.test(w.word));
  // For editing, keep original order and let CSS RTL handle the display
  // For viewing, we also let CSS handle it now
  const displayWords = cleanWords;

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="mb-5 leading-relaxed"
      style={{
        direction: rtl ? 'rtl' : 'ltr',
        textAlign: rtl ? 'right' : 'left',
        display: 'block',
        width: '100%',
        fontFamily: '"Baskerville", "Baskerville Old Face", "Goudy Old Style", "Palatino", "Palatino Linotype", "Book Antiqua", "Times New Roman", serif'
      }}
    >
      <div
        className="flex flex-wrap"
        dir={hasHebrew ? 'rtl' : 'ltr'}
        style={{
          direction: hasHebrew ? 'rtl' : 'ltr',
          justifyContent: hasHebrew ? 'flex-start' : 'flex-start',
          width: '100%',
          gap: '0.25em',
          maxWidth: '100%'
        }}
      >
        {displayWords.map((wordObj, displayIdx) => {
          // Map display index back to original array index for editing
          // Since we filtered words, we need to find the original index
          const originalWordIndex = originalWords.findIndex((w, idx) => {
            const cleaned = w.word ? w.word.replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '').trim() : '';
            return cleaned === wordObj.word && cleaned.length > 0;
          });
          const originalIdx = originalWordIndex !== -1 ? originalWordIndex : (hasHebrew ? originalWords.length - 1 - displayIdx : displayIdx);
          const { word, chord } = wordObj;
          const isEditing = editingIndex === originalIdx;
          // Check if this specific word contains Hebrew
          const wordHasHebrew = /[\u0590-\u05FF]/.test(word);
          const wordDir = wordHasHebrew ? 'rtl' : 'ltr';

          return (
            <div
              key={originalIdx}
              className="inline-flex flex-col items-center flex-shrink-0"
              dir={wordDir}
              style={{ minWidth: `${Math.max(word.length, (chord || '').length) * 0.9}em`, marginRight: editable ? '0' : '0.05em', marginLeft: editable ? '0' : '0.05em' }}
            >
              {/* Chord - smaller, above */}
              {editable ? (
                <input
                  type="text"
                  value={chord || ''}
                  onChange={(e) => handleChordChange(originalIdx, e.target.value)}
                  className="text-blue-700 font-bold text-xs h-5 bg-transparent border-none outline-none focus:bg-blue-50 px-1 whitespace-nowrap w-full text-center"
                  placeholder="-"
                  dir="ltr"
                />
              ) : (
                <div
                  className="text-blue-700 font-bold text-xl h-9 whitespace-nowrap px-1 text-center"
                  dir="ltr"
                  style={{
                    letterSpacing: '0.1em',
                    fontFamily: '"Baskerville", "Baskerville Old Face", "Goudy Old Style", "Palatino", "Palatino Linotype", "Book Antiqua", "Times New Roman", serif',
                    fontWeight: '600'
                  }}
                >
                  {chord || ''}
                </div>
              )}

              {/* Word - larger, prominent, below chord */}
              {editable ? (
                <input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(originalIdx, e.target.value)}
                  onFocus={() => setEditingIndex(originalIdx)}
                  onBlur={() => setEditingIndex(null)}
                  className="text-gray-900 text-3xl font-normal bg-transparent border-none outline-none focus:bg-blue-50 px-2 whitespace-nowrap w-full text-center"
                  dir={wordDir}
                  style={{ fontFamily: '"Baskerville", "Baskerville Old Face", "Goudy Old Style", "Palatino", "Palatino Linotype", "Book Antiqua", "Times New Roman", serif' }}
                />
              ) : (
                <div
                  className="text-gray-900 text-3xl font-normal whitespace-nowrap px-2 text-center"
                  dir={wordDir}
                  style={{
                    lineHeight: '1.5',
                    fontFamily: '"Baskerville", "Baskerville Old Face", "Goudy Old Style", "Palatino", "Palatino Linotype", "Book Antiqua", "Times New Roman", serif',
                    letterSpacing: '0.02em',
                    fontWeight: '400'
                  }}
                >
                  {word}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
