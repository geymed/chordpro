export type Lang = "he" | "en";

export interface SongDoc {
  id: string;
  primaryLang: Lang;
  titles: Record<Lang, string>;
  artists?: Record<Lang, string>;
  aliases?: Array<{ lang: Lang; value: string }>;
  tags?: string[];
  key?: string;
  capo?: number;
  tempo?: number;
  timeSig?: string;
  sources?: SourceRef[];
  sections: Section[];
  renderHints?: { layout?: "inline" | "above"; chordLanguage?: "latin" };
  search: SearchMeta;
  createdAt: string;
  updatedAt: string;
}

export interface SourceRef { kind: "url" | "image" | "pdf" | "text"; uri: string; page?: number; }

export type Token =
  | { t: "txt"; lang?: Lang; v: string }
  | { t: "chord"; v: Chord; beat?: number }
  | { t: "nl" };

export interface Section {
  id: string;
  kind: "intro"|"verse"|"pre"|"chorus"|"bridge"|"solo"|"outro"|"other";
  title?: Record<Lang, string>;
  lines: Token[][];
}

export interface Chord {
  root: "A"|"B"|"C"|"D"|"E"|"F"|"G";
  accidental?: "#"|"b";
  quality?: "m"|"maj"|"min"|"dim"|"aug";
  ext?: Array<"6"|"7"|"9"|"11"|"13"|"maj7"|"m7"|"sus2"|"sus4"|"add9">;
  slash?: { root: Chord["root"]; accidental?: "#"|"b" };
}

export interface SearchMeta {
  normalizedTitles: string[];
  normalizedArtists: string[];
  ngrams?: string[];
}
