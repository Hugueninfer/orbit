import { expect, it } from "vitest";
import { treeVariant } from "./treeVariants";
it("defines 10 stable distinct visual models across three families", () => {
  const variants = Array.from({ length: 10 }, (_, i) => treeVariant(i));
  expect(new Set(variants.map((v) => JSON.stringify(v))).size).toBe(10);
  expect(new Set(variants.map((v) => v.species))).toEqual(
    new Set(["oak", "pine", "sakura"]),
  );
  expect(treeVariant(5)).toEqual(variants[5]);
  expect(() => treeVariant(10)).toThrow();
  expect(() => treeVariant(-1)).toThrow();
});
