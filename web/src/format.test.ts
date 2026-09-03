import { describe, expect, it } from "vitest";
import {
  parseMoney,
  parseBalance,
  localDate,
  installmentParts,
  displayLoad,
  canonicalLoad,
  weekDates,
} from "./format";
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

describe("weight display preferences", () => {
  it("converts pounds while keeping the API canonical kilograms", () => {
    expect(displayLoad("10", "lb")).toBe("22.046");
    expect(canonicalLoad("22.046", "lb")).toBe("10");
    expect(canonicalLoad("32.5", "kg")).toBe("32.5");
  });
});

describe("calendar preference", () => {
  it("starts the week at the preferred weekday across month/year boundaries", () => {
    expect(weekDates("2027-01-01", 0)).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
    expect(weekDates("2027-01-01", 6)[0]).toBe("2026-12-27");
  });
});

it("accepts zero and overdraft opening balances without permitting negative expenses", () => {
  expect(parseBalance("0,00")).toBe(0);
  expect(parseBalance("-1.234,56")).toBe(-123456);
  expect(() => parseMoney("-1.234,56")).toThrow();
});
