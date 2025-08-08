#!/usr/bin/env bash
# bootstrap.sh — initial scaffold for chords-multilang core
set -euo pipefail

mkdir -p packages/core/src

cat > .gitignore <<'EOF'
node_modules
dist
.DS_Store
.vscode
.env*
EOF

cat > LICENSE <<'EOF'
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice (including the next
paragraph) shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
EOF

cat > README.md <<'EOF'
# chordpro

Open-source building blocks for dual-language songs + chords.

## Packages (initial)
- `@chords/core`: canonical types, normalization, chord utils, transposer.

## Dev
```bash
pnpm i
pnpm -r -F @chords/core build
```
EOF

cat > package.json <<'EOF'
{
  "name": "chords-multilang",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.0.0",
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "pnpm -r --filter ./packages/* build",
    "typecheck": "tsc -b packages/*"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
EOF

cat > pnpm-workspace.yaml <<'EOF'
packages:
  - "packages/*"
EOF

cat > tsconfig.base.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "declaration": true,
    "strict": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "baseUrl": "."
  }
}
EOF

cat > packages/core/package.json <<'EOF'
{
  "name": "@chords/core",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "scripts": { "build": "tsc -p tsconfig.json" },
  "devDependencies": { "typescript": "^5.5.0" }
}
EOF

cat > packages/core/tsconfig.json <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"]
}
EOF

cat > packages/core/src/types.ts <<'EOF'
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
EOF

cat > packages/core/src/normalize.ts <<'EOF'
export function normalizeForSearch(input: string) {
  const nfkc = input.normalize("NFKC");
  const noNiqqud = nfkc.replace(/[\u0591-\u05C7]/g, "");
  return noNiqqud.toLocaleLowerCase();
}
EOF

cat > packages/core/src/chords.ts <<'EOF'
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
EOF

cat > packages/core/src/transposer.ts <<'EOF'
const SHARPS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
const FLATS  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"] as const;

function idx(root: string) {
  const i = SHARPS.indexOf(root as any);
  return i >= 0 ? i : FLATS.indexOf(root as any);
}

export function transposeRoot(root: string, delta: number, preferFlats = false): string {
  const scale = preferFlats ? FLATS : SHARPS;
  const i = idx(root);
  if (i < 0) return root;
  return scale[(i + ((delta % 12) + 12)) % 12];
}
EOF

cat > packages/core/src/index.ts <<'EOF'
export * from "./types";
export * from "./normalize";
export * from "./chords";
export * from "./transposer";
EOF

echo "
Scaffold created. Next steps:
1) pnpm i
2) pnpm -r -F @chords/core build
3) git add -A && git commit -m 'feat(core): initial scaffold'
"
