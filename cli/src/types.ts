export type Language = 'he' | 'en';

export type Note = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Accidental = '#' | 'b' | null;
export type ChordQuality = 'major' | 'minor' | 'dim' | 'aug' | 'sus2' | 'sus4' | null;
export type Extension = number | null; // 7, 9, 11, 13, etc.

export interface Chord {
  note: Note;
  accidental: Accidental; // # (sharp) or b (flat)
  quality: ChordQuality; // major, minor, dim, aug, sus2, sus4
  extension: Extension; // 7, 9, 11, 13, etc.
  add: number | null; // add2, add4, add9, etc.
  inversion: Note | null; // Bass note for inversions (e.g., C/E)
  special: 'N.C.' | 'x' | null; // Special cases like "No Chord" or muted
  explicitMaj?: boolean; // True if "maj" was explicitly present (e.g., "Cmaj7" vs "C7")
}

export interface ChordLine {
  chords: (Chord | string)[]; // Support both structured Chord and string for backward compatibility
  lyrics: string;
}

export interface Section {
  id: string;
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro';
  label: string;
  lines: ChordLine[];
}

export interface ChordSheet {
  id: string;
  title: string;
  titleEn?: string;
  artist: string;
  artistEn?: string;
  language: Language;
  key?: string;
  tempo?: string;
  capo?: number;
  sections: Section[];
  dateAdded: string;
}

