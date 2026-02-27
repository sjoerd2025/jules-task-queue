import { describe, it, expect } from "vitest";
import {
  isSafeNumberBigInt,
  toSafeNumber,
  toBigInt,
  MAX_SAFE_INTEGER_BIGINT,
} from "./number";

describe("src/lib/number.ts", () => {
  describe("isSafeNumberBigInt", () => {
    it("returns true for safe positive integers", () => {
      expect(isSafeNumberBigInt(1n)).toBe(true);
      expect(isSafeNumberBigInt(100n)).toBe(true);
      expect(isSafeNumberBigInt(MAX_SAFE_INTEGER_BIGINT)).toBe(true);
    });

    it("returns true for safe negative integers", () => {
      expect(isSafeNumberBigInt(-1n)).toBe(true);
      expect(isSafeNumberBigInt(-100n)).toBe(true);
      expect(isSafeNumberBigInt(BigInt(Number.MIN_SAFE_INTEGER))).toBe(true);
    });

    it("returns true for zero", () => {
      expect(isSafeNumberBigInt(0n)).toBe(true);
    });

    it("returns false for unsafe positive integers", () => {
      expect(isSafeNumberBigInt(MAX_SAFE_INTEGER_BIGINT + 1n)).toBe(false);
      expect(isSafeNumberBigInt(MAX_SAFE_INTEGER_BIGINT + 100n)).toBe(false);
    });

    it("returns false for unsafe negative integers", () => {
      expect(isSafeNumberBigInt(BigInt(Number.MIN_SAFE_INTEGER) - 1n)).toBe(
        false,
      );
      expect(isSafeNumberBigInt(BigInt(Number.MIN_SAFE_INTEGER) - 100n)).toBe(
        false,
      );
    });
  });

  describe("toSafeNumber", () => {
    it("converts safe positive BigInts to number", () => {
      expect(toSafeNumber(1n)).toBe(1);
      expect(toSafeNumber(MAX_SAFE_INTEGER_BIGINT)).toBe(
        Number.MAX_SAFE_INTEGER,
      );
    });

    it("converts safe negative BigInts to number", () => {
      expect(toSafeNumber(-1n)).toBe(-1);
      expect(toSafeNumber(BigInt(Number.MIN_SAFE_INTEGER))).toBe(
        Number.MIN_SAFE_INTEGER,
      );
    });

    it("converts zero BigInt to number", () => {
      expect(toSafeNumber(0n)).toBe(0);
    });

    it("throws error for unsafe positive BigInts", () => {
      expect(() => toSafeNumber(MAX_SAFE_INTEGER_BIGINT + 1n)).toThrow(
        "BigInt value is out of safe number range",
      );
    });

    it("throws error for unsafe negative BigInts", () => {
      expect(() => toSafeNumber(BigInt(Number.MIN_SAFE_INTEGER) - 1n)).toThrow(
        "BigInt value is out of safe number range",
      );
    });
  });

  describe("toBigInt", () => {
    it("returns the same BigInt if input is BigInt", () => {
      expect(toBigInt(123n)).toBe(123n);
    });

    it("converts number to BigInt", () => {
      expect(toBigInt(123)).toBe(123n);
      expect(toBigInt(0)).toBe(0n);
      expect(toBigInt(-123)).toBe(-123n);
    });

    it("converts string to BigInt", () => {
      expect(toBigInt("123")).toBe(123n);
      expect(toBigInt("0")).toBe(0n);
      expect(toBigInt("-123")).toBe(-123n);
    });

    it("throws SyntaxError for invalid strings", () => {
      expect(() => toBigInt("abc")).toThrow(SyntaxError);
      expect(() => toBigInt("12.34")).toThrow(SyntaxError);
    });
  });
});
