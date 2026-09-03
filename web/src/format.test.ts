import { describe, expect, it } from "vitest";
import { parseMoney, localDate, installmentParts } from "./format";
describe("financial input and local dates", () => {
  it("parses localized money without binary float rounding", () => {
    expect(parseMoney("1.234,56")).toBe(123456);
    expect(parseMoney("0,29")).toBe(29);
    expect(() => parseMoney("1,001")).toThrow();
    expect(() => parseMoney("-5")).toThrow();
  });
  it("preserves exact installment totals", () => {
    expect(installmentParts(1001, 3)).toEqual([334, 334, 333]);
    expect(() => installmentParts(2, 3)).toThrow();
  });
  it("uses profile timezone at day boundaries", () => {
    expect(
      localDate("America/Sao_Paulo", new Date("2026-09-04T01:00:00Z")),
    ).toBe("2026-09-03");
  });
});
