import { describe, expect, it } from "vitest";
import { remainingSeconds, growthStage, formatTimer } from "./focusClock";

describe("focus clock", () => {
  it("recovers elapsed time after sleeping or navigating away", () => {
    const session = {
      status: "running",
      deadline_at: "2026-09-04T12:25:00Z",
      remaining_seconds: 1500,
    };
    expect(remainingSeconds(session, Date.parse("2026-09-04T12:20:00Z"))).toBe(
      300,
    );
    expect(remainingSeconds(session, Date.parse("2026-09-04T13:00:00Z"))).toBe(
      0,
    );
  });
  it("freezes paused sessions and never grows a completed tree early", () => {
    expect(
      remainingSeconds(
        { status: "paused", deadline_at: null, remaining_seconds: 123 },
        9999999,
      ),
    ).toBe(123);
    expect(growthStage(0)).toBe(0);
    expect(growthStage(0.4)).toBe(1);
    expect(growthStage(0.8)).toBe(2);
    expect(growthStage(1)).toBe(3);
    expect(formatTimer(65)).toBe("01:05");
  });
});
