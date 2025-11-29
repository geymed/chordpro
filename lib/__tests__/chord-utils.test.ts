import { parseChord, chordToString } from '../chord-utils';
import { Chord } from '@/types';

describe('Chord Parsing and Validation', () => {
  describe('parseChord', () => {
    test('should parse basic chords correctly', () => {
      expect(parseChord('C')).toEqual({
        note: 'C',
        accidental: null,
        quality: 'major',
        extension: null,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: false,
      });

      expect(parseChord('Am')).toEqual({
        note: 'A',
        accidental: null,
        quality: 'minor',
        extension: null,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: false,
      });
    });

    test('should parse chords with accidentals', () => {
      expect(parseChord('C#')).toEqual({
        note: 'C',
        accidental: '#',
        quality: 'major',
        extension: null,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: false,
      });

      expect(parseChord('Bb')).toEqual({
        note: 'B',
        accidental: 'b',
        quality: 'major',
        extension: null,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: false,
      });
    });

    test('should fix truncated "di" to "dim"', () => {
      expect(parseChord('G#di')).toEqual({
        note: 'G',
        accidental: '#',
        quality: 'dim',
        extension: null,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: false,
      });

      expect(parseChord('Cdi')).toEqual({
        note: 'C',
        accidental: null,
        quality: 'dim',
        extension: null,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: false,
      });
    });

    test('should parse diminished chords', () => {
      expect(parseChord('G#dim')).toEqual({
        note: 'G',
        accidental: '#',
        quality: 'dim',
        extension: null,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: false,
      });

      expect(parseChord('Cdim')).toEqual({
        note: 'C',
        accidental: null,
        quality: 'dim',
        extension: null,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: false,
      });
    });

    test('should parse chords with extensions', () => {
      expect(parseChord('Am7')).toEqual({
        note: 'A',
        accidental: null,
        quality: 'minor',
        extension: 7,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: false,
      });

      expect(parseChord('C7')).toEqual({
        note: 'C',
        accidental: null,
        quality: 'major',
        extension: 7,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: false,
      });

      expect(parseChord('Fmaj7')).toEqual({
        note: 'F',
        accidental: null,
        quality: 'major',
        extension: 7,
        add: null,
        inversion: null,
        special: null,
        explicitMaj: true,
      });
    });

    test('should parse chords with inversions', () => {
      expect(parseChord('C/E')).toEqual({
        note: 'C',
        accidental: null,
        quality: 'major',
        extension: null,
        add: null,
        inversion: 'E',
        special: null,
        explicitMaj: false,
      });
    });

    test('should parse special cases', () => {
      expect(parseChord('N.C.')).toEqual({
        note: 'A',
        accidental: null,
        quality: null,
        extension: null,
        add: null,
        inversion: null,
        special: 'N.C.',
        explicitMaj: false,
      });

      expect(parseChord('x')).toEqual({
        note: 'A',
        accidental: null,
        quality: null,
        extension: null,
        add: null,
        inversion: null,
        special: 'x',
        explicitMaj: false,
      });
    });

    test('should handle empty strings', () => {
      expect(parseChord('')).toBeNull();
      expect(parseChord('   ')).toBeNull();
    });
  });

  describe('chordToString', () => {
    test('should convert Chord objects back to strings', () => {
      expect(chordToString({
        note: 'C',
        accidental: null,
        quality: 'major',
        extension: null,
        add: null,
        inversion: null,
        special: null,
      })).toBe('C');

      expect(chordToString({
        note: 'A',
        accidental: null,
        quality: 'minor',
        extension: null,
        add: null,
        inversion: null,
        special: null,
      })).toBe('Am');

      expect(chordToString({
        note: 'G',
        accidental: '#',
        quality: 'dim',
        extension: null,
        add: null,
        inversion: null,
        special: null,
      })).toBe('G#dim');

      expect(chordToString({
        note: 'A',
        accidental: null,
        quality: 'minor',
        extension: 7,
        add: null,
        inversion: null,
        special: null,
      })).toBe('Am7');

      expect(chordToString({
        note: 'C',
        accidental: null,
        quality: 'major',
        extension: null,
        add: null,
        inversion: 'E',
        special: null,
      })).toBe('C/E');
    });

    test('should handle special cases', () => {
      expect(chordToString({
        note: 'A',
        accidental: null,
        quality: null,
        extension: null,
        add: null,
        inversion: null,
        special: 'N.C.',
      })).toBe('N.C.');

      expect(chordToString({
        note: 'A',
        accidental: null,
        quality: null,
        extension: null,
        add: null,
        inversion: null,
        special: 'x',
      })).toBe('x');
    });
  });

  describe('round-trip conversion', () => {
    const testCases = [
      'C',
      'Am',
      'G#dim',
      'Bb7',
      'Fmaj7',
      'Dm7',
      'C/E',
      'G#dim',
      'Am9',
      'Csus4',
      'Faug',
    ];

    testCases.forEach(chordStr => {
      test(`should round-trip "${chordStr}" correctly`, () => {
        const parsed = parseChord(chordStr);
        expect(parsed).not.toBeNull();
        if (parsed) {
          const converted = chordToString(parsed);
          expect(converted).toBe(chordStr);
        }
      });
    });
  });

  describe('fixing invalid chords', () => {
    test('should fix "G#di" to "G#dim"', () => {
      const parsed = parseChord('G#di');
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(parsed.quality).toBe('dim');
        expect(chordToString(parsed)).toBe('G#dim');
      }
    });

    test('should fix "Cdi" to "Cdim"', () => {
      const parsed = parseChord('Cdi');
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(parsed.quality).toBe('dim');
        expect(chordToString(parsed)).toBe('Cdim');
      }
    });
  });
});

