export type Language = 'he' | 'en';
export type Note = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Accidental = '#' | 'b' | null;
export type ChordQuality = 'major' | 'minor' | 'dim' | 'aug' | 'sus2' | 'sus4' | null;
export type Extension = number | null;
export interface Chord {
    note: Note;
    accidental: Accidental;
    quality: ChordQuality;
    extension: Extension;
    add: number | null;
    inversion: Note | null;
    special: 'N.C.' | 'x' | null;
    explicitMaj?: boolean;
}
export interface ChordLine {
    chords: (Chord | string)[];
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
//# sourceMappingURL=types.d.ts.map