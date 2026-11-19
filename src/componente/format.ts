export function dataRo(iso: string): string {
  const [a, l, z] = iso.slice(0, 10).split("-");
  return `${z}.${l}.${a}`;
}
