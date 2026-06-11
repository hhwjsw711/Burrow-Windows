import { describe, it, expect } from "vitest";
import { formatBytes, formatUptime } from "./format";

describe("formatBytes", () => {
  it('returns "0 B" for zero', () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes correctly", () => {
    expect(formatBytes(500)).toBe("500.0 B");
  });

  it("formats KB correctly", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats MB correctly", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formats GB correctly", () => {
    expect(formatBytes(3.5 * 1024 * 1024 * 1024)).toBe("3.5 GB");
  });

  it("formats TB correctly", () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024 * 1024)).toBe("2.0 TB");
  });
});

describe("formatUptime", () => {
  it('returns "0d 0h 0m" for zero', () => {
    expect(formatUptime(0)).toBe("0d 0h 0m");
  });

  it("formats seconds to days/hours/minutes", () => {
    expect(formatUptime(90061)).toBe("1d 1h 1m");
  });

  it("handles only minutes", () => {
    expect(formatUptime(120)).toBe("0d 0h 2m");
  });

  it("handles only hours", () => {
    expect(formatUptime(7200)).toBe("0d 2h 0m");
  });
});
