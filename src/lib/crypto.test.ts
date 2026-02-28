import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the environment to provide a valid token encryption key
// 64 hexadecimal characters (32 bytes) for AES-256-CBC
const MOCK_KEY = vi.hoisted(() => '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');

vi.mock('@/lib/env', () => ({
  env: {
    TOKEN_ENCRYPTION_KEY: MOCK_KEY,
  },
}));

// Mock logger to suppress errors during tests and allow verifying them
const mockLoggerError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/logger', () => ({
  default: {
    error: mockLoggerError,
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { encrypt, decrypt } from './crypto';

describe('crypto utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('encrypt and decrypt (Happy Path)', () => {
    it('should encrypt and decrypt a string successfully', () => {
      const originalText = 'my-secret-token-123';
      const encrypted = encrypt(originalText);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).toContain(':');
      expect(encrypted).not.toBe(originalText);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalText);
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('should handle empty string payload successfully', () => {
      const originalText = '';
      const encrypted = encrypt(originalText);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalText);
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('should produce different encrypted values for the same input (due to random IV)', () => {
      const originalText = 'same-input';
      const encrypted1 = encrypt(originalText);
      const encrypted2 = encrypt(originalText);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(originalText);
      expect(decrypt(encrypted2)).toBe(originalText);
    });
  });

  describe('decrypt failure cases', () => {
    it('should return null for null or undefined input', () => {
      // @ts-expect-error Testing invalid input
      expect(decrypt(null)).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith('Invalid input format for decryption');

      // @ts-expect-error Testing invalid input
      expect(decrypt(undefined)).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith('Invalid input format for decryption');
    });

    it('should return null for non-string input', () => {
      // @ts-expect-error Testing invalid input
      expect(decrypt(123)).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith('Invalid input format for decryption');

      // @ts-expect-error Testing invalid input
      expect(decrypt({})).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith('Invalid input format for decryption');
    });

    it('should return null for string missing colon separator', () => {
      expect(decrypt('invalidencryptedtext')).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith('Invalid input format for decryption');
    });

    it('should return null for string with multiple colons', () => {
      expect(decrypt('iv:text:extra')).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith('Invalid encrypted text format');
    });

    it('should return null if IV is missing', () => {
      expect(decrypt(':encryptedText')).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith('IV or encrypted text is missing');
    });

    it('should return null if encrypted text is missing', () => {
      expect(decrypt('ivhex:')).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith('IV or encrypted text is missing');
    });

    it('should return null for invalid IV length', () => {
      // IV length should be 16 bytes (32 hex characters)
      // Providing a 15-byte IV (30 hex characters)
      const invalidIv = '0123456789abcdef0123456789abcd';
      expect(decrypt(`${invalidIv}:encryptedText`)).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Invalid IV length'));
    });

    it('should return null and catch error for invalid hex in IV', () => {
      // 16 bytes IV but invalid hex characters
      const invalidHexIv = 'xx23456789abcdef0123456789abcdef';
      // Buffer.from with invalid hex might truncate or behave weirdly,
      // which leads to length mismatch or decryption error.
      expect(decrypt(`${invalidHexIv}:someencryptedtext`)).toBeNull();
    });

    it('should return null and catch error for invalid ciphertext', () => {
      // Valid IV (32 hex chars), but invalid ciphertext
      const validIv = '0123456789abcdef0123456789abcdef';
      const invalidCiphertext = 'this-is-not-valid-hex-or-ciphertext';
      expect(decrypt(`${validIv}:${invalidCiphertext}`)).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Decryption failed'));
    });

    it('should return null and catch error when decryption with wrong key/tampered data fails', () => {
       const encrypted = encrypt('my-secret-data');
       const [iv, ciphertext] = encrypted.split(':');

       // Tamper with the ciphertext
       const tamperedCiphertext = ciphertext!.substring(0, ciphertext!.length - 2) + '00';

       expect(decrypt(`${iv}:${tamperedCiphertext}`)).toBeNull();
       expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Decryption failed'));
    });
  });
});
