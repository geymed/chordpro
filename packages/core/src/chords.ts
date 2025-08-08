import type { Chord } from "./types";

export const CHORD_RE =
  /\b([A-G][#b]?)(m|maj|min|maj7|m7|sus2|sus4|add9|dim|aug|6|7|9|11|13)?(\/[A-G][#b]?)?\b/g;

export function chordToString(c: Chord): string {
  const base = c.root + (c.accidental ?? "");
  const qual = c.quality ?? "";
  const ext = c.ext?.join("") ?? "";
  const slash = c.slash ? `/${c.slash.root}${c.slash.accidental ?? ""}` : "";
  return `${base}${qual}${ext}${slash}`;
}
