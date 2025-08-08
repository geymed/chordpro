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
