export function normalizeForSearch(input: string) {
  const nfkc = input.normalize("NFKC");
  const noNiqqud = nfkc.replace(/[\u0591-\u05C7]/g, "");
  return noNiqqud.toLocaleLowerCase();
}
