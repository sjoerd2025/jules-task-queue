import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the environment variables BEFORE importing the module under test.
// Since src/lib/crypto.ts reads env.TOKEN_ENCRYPTION_KEY at the top level,
// we need to mock it so that when crypto.ts is imported, it gets the mocked value.
vi.mock('@/lib/env', () => ({
  env: {
    // 32 bytes (256 bits) key hex encoded = 64 hex characters
    TOKEN_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
}));

// Mock the logger to avoid polluting the test output with expected errors.
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}));

import { encrypt, decrypt } from '@/lib/crypto';
import logger from '@/lib/logger';

describe('crypto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('encrypt', () => {
    it('should return a string in the format iv:encryptedText', () => {
      const text = 'hello world';
      const result = encrypt(text);
      expect(typeof result).toBe('string');

      const parts = result.split(':');
      expect(parts.length).toBe(2);

      const [iv, encrypted] = parts;
      // IV should be 16 bytes = 32 hex chars
      expect(iv).toMatch(/^[0-9a-f]{32}$/);
      // Encrypted text should be hex string
      expect(encrypted).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different outputs for the same input (random IV)', () => {
      const text = 'sensitive data';
      const result1 = encrypt(text);
      const result2 = encrypt(text);
      expect(result1).not.toBe(result2);

      const [iv1] = result1.split(':');
      const [iv2] = result2.split(':');
      expect(iv1).not.toBe(iv2); // IVs should be different
    });
  });

  describe('decrypt', () => {
    it('should correctly decrypt an encrypted string', () => {
      const original = 'test message 123';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should return null for invalid format (missing colon)', () => {
      expect(decrypt('invalidstring')).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Invalid input format for decryption');
    });

    it('should return null for invalid format (too many parts)', () => {
      expect(decrypt('part1:part2:part3')).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Invalid encrypted text format');
    });

    it('should return null for missing parts', () => {
        // "part1:" splits to ["part1", ""]
      expect(decrypt('part1:')).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('IV or encrypted text is missing');
    });

    it('should return null for invalid IV length', () => {
      // IV length is 16 bytes = 32 hex chars. Let's provide 30 chars.
      const invalidIv = 'a'.repeat(30);
      const validEncrypted = 'deadbeef';
      expect(decrypt(`${invalidIv}:${validEncrypted}`)).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid IV length'));
    });

    it('should return null when decryption fails (bad key/data)', () => {
      // Valid IV length (32 hex chars), but garbage encrypted data
      const validIv = '0'.repeat(32);
      const invalidEncrypted = 'deadbeef'; // Might not be valid block size or padding

      // Note: decipher.final() throws if padding is incorrect.
      // crypto.ts catches the error and returns null.
      const result = decrypt(`${validIv}:${invalidEncrypted}`);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Decryption failed'));
    });
  });
});
