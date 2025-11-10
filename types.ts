export type Language = 'he' | 'en';

export interface ChordLine {
  chords: string[];
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

