import { describe, it, expect } from "vitest";
import {
  toSafeNumber,
  isSafeNumberBigInt,
  toBigInt,
  MAX_SAFE_INTEGER_BIGINT,
} from "./number";

describe("number utils", () => {
  describe("toSafeNumber", () => {
    it("should safely convert safe bigints to number", () => {
      expect(toSafeNumber(0n)).toBe(0);
      expect(toSafeNumber(1n)).toBe(1);
      expect(toSafeNumber(-1n)).toBe(-1);
      expect(toSafeNumber(MAX_SAFE_INTEGER_BIGINT)).toBe(
        Number.MAX_SAFE_INTEGER,
      );
      expect(toSafeNumber(BigInt(Number.MIN_SAFE_INTEGER))).toBe(
        Number.MIN_SAFE_INTEGER,
      );
    });

    it("should throw error for unsafe bigints", () => {
      expect(() => toSafeNumber(MAX_SAFE_INTEGER_BIGINT + 1n)).toThrow(
        "BigInt value is out of safe number range",
      );
      expect(() => toSafeNumber(BigInt(Number.MIN_SAFE_INTEGER) - 1n)).toThrow(
        "BigInt value is out of safe number range",
      );
    });
  });

  describe("isSafeNumberBigInt", () => {
    it("should return true for safe bigints", () => {
      expect(isSafeNumberBigInt(0n)).toBe(true);
      expect(isSafeNumberBigInt(1n)).toBe(true);
      expect(isSafeNumberBigInt(-1n)).toBe(true);
      expect(isSafeNumberBigInt(MAX_SAFE_INTEGER_BIGINT)).toBe(true);
      expect(isSafeNumberBigInt(BigInt(Number.MIN_SAFE_INTEGER))).toBe(true);
    });

    it("should return false for unsafe bigints", () => {
      expect(isSafeNumberBigInt(MAX_SAFE_INTEGER_BIGINT + 1n)).toBe(false);
      expect(isSafeNumberBigInt(BigInt(Number.MIN_SAFE_INTEGER) - 1n)).toBe(
        false,
      );
    });
  });

  describe("toBigInt", () => {
    it("should convert number to bigint", () => {
      expect(toBigInt(123)).toBe(123n);
      expect(toBigInt(0)).toBe(0n);
      expect(toBigInt(-123)).toBe(-123n);
    });

    it("should convert string to bigint", () => {
      expect(toBigInt("123")).toBe(123n);
      expect(toBigInt("0")).toBe(0n);
      expect(toBigInt("-123")).toBe(-123n);
    });

    it("should return bigint as is", () => {
      expect(toBigInt(123n)).toBe(123n);
      expect(toBigInt(0n)).toBe(0n);
      expect(toBigInt(-123n)).toBe(-123n);
    });
  });
});
