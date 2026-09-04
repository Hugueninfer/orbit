export type TreeFamily = "oak" | "pine" | "sakura";
const hues = [
  [145, 110, 80, 44, 23, 172, 192, 128, 8, 265],
  [154, 135, 100, 177, 193, 210, 72, 42, 160, 230],
  [330, 345, 315, 280, 260, 20, 45, 355, 300, 165],
];
// Ten curated visual recipes. IDs are a stable visual contract for saved gardens.
export function treeVariant(id: number) {
  if (!Number.isInteger(id) || id < 0 || id >= 10)
    throw new RangeError("Tree variant outside catalog");
  const family = id % 3;
  const palette = [0, 2, 0, 3, 4, 3, 7, 5, 5, 5][id];
  const shape = [0, 1, 5, 8, 6, 2, 4, 9, 9, 7][id];
  const hue = hues[family][palette];
  const lightness = family === 2 ? 69 : 49;
  return {
    species: (["oak", "pine", "sakura"] as const)[family],
    shape,
    colors: [
      `hsl(${hue} 49% ${lightness + 14}%)`,
      `hsl(${hue} 42% ${lightness}%)`,
      `hsl(${hue} 37% ${lightness - 15}%)`,
    ],
    trunk: `hsl(${24 + palette * 2} 28% ${34 + (shape % 3) * 6}%)`,
    accent: `hsl(${(hue + 50) % 360} 65% 82%)`,
  };
}
