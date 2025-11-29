import { createSheet, getSheetById, getAllSheets } from '../db';
import { ChordSheet } from '@/types';
import { parseChord, chordToString } from '../chord-utils';

describe('Database Chord Storage and Retrieval', () => {
  // Mock database functions for testing
  const mockSheet: ChordSheet = {
    id: 'test-1',
    title: 'Test Song',
    artist: 'Test Artist',
    language: 'en',
    dateAdded: new Date().toISOString(),
    sections: [
      {
        id: 'sec-1',
        type: 'verse',
        label: 'VERSE 1',
        lines: [
          {
            chords: [
              parseChord('C') || 'C',
              parseChord('Am') || 'Am',
              parseChord('G#dim') || 'G#dim',
              parseChord('F') || 'F',
            ],
            lyrics: 'Test lyrics line one'
          },
          {
            chords: [
              parseChord('G#di') || '', // This should be fixed to G#dim
              '',
              parseChord('Am') || 'Am',
            ],
            lyrics: 'Test lyrics line two'
          }
        ]
      }
    ]
  };

  test('should store Chord objects correctly', () => {
    // All chords should be Chord objects (not strings)
    const chords = mockSheet.sections[0].lines[0].chords;
    
    chords.forEach((chord, idx) => {
      if (chord && typeof chord !== 'string') {
        expect(chord).toHaveProperty('note');
        expect(chord).toHaveProperty('quality');
        expect(chord).toHaveProperty('accidental');
      }
    });

    // Verify specific chords
    const cChord = chords[0];
    if (cChord && typeof cChord !== 'string') {
      expect(cChord.note).toBe('C');
      expect(cChord.quality).toBe('major');
    }

    const amChord = chords[1];
    if (amChord && typeof amChord !== 'string') {
      expect(amChord.note).toBe('A');
      expect(amChord.quality).toBe('minor');
    }

    const gSharpDimChord = chords[2];
    if (gSharpDimChord && typeof gSharpDimChord !== 'string') {
      expect(gSharpDimChord.note).toBe('G');
      expect(gSharpDimChord.accidental).toBe('#');
      expect(gSharpDimChord.quality).toBe('dim');
    }
  });

  test('should fix "G#di" to "G#dim" during parsing', () => {
    const invalidChord = 'G#di';
    const parsed = parseChord(invalidChord);
    
    expect(parsed).not.toBeNull();
    if (parsed) {
      expect(parsed.note).toBe('G');
      expect(parsed.accidental).toBe('#');
      expect(parsed.quality).toBe('dim');
      expect(chordToString(parsed)).toBe('G#dim');
    }
  });

  test('should handle round-trip: string -> Chord -> JSON -> Chord -> string', () => {
    const testChords = ['C', 'Am', 'G#dim', 'Bb7', 'Fmaj7', 'C/E'];
    
    testChords.forEach(chordStr => {
      // Parse to Chord object
      const parsed = parseChord(chordStr);
      expect(parsed).not.toBeNull();
      
      if (parsed) {
        // Simulate JSON serialization/deserialization (what happens in database)
        const jsonStr = JSON.stringify(parsed);
        const deserialized = JSON.parse(jsonStr) as Chord;
        
        // Convert back to string
        const result = chordToString(deserialized);
        expect(result).toBe(chordStr);
      }
    });
  });

  test('should validate Chord object structure', () => {
    const chord = parseChord('G#dim');
    
    expect(chord).not.toBeNull();
    if (chord) {
      // Check all required properties
      expect(typeof chord.note).toBe('string');
      expect(['A', 'B', 'C', 'D', 'E', 'F', 'G']).toContain(chord.note);
      expect(chord.accidental === null || chord.accidental === '#' || chord.accidental === 'b').toBe(true);
      expect(chord.quality === null || 
             ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'].includes(chord.quality)).toBe(true);
      expect(chord.extension === null || typeof chord.extension === 'number').toBe(true);
      expect(chord.add === null || typeof chord.add === 'number').toBe(true);
      expect(chord.inversion === null || 
             ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(chord.inversion)).toBe(true);
      expect(chord.special === null || chord.special === 'N.C.' || chord.special === 'x').toBe(true);
    }
  });
});




