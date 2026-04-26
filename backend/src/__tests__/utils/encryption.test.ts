// filepath: vaultfinance/backend/src/__tests__/utils/encryption.test.ts
import { encryptField, decryptField, maskAadhaar, maskPAN } from '../../utils/encryption';

describe('Encryption Utility', () => {
  // Set up the encryption key for tests
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  describe('encryptField()', () => {
    it('should encrypt a plain text string', () => {
      const plainText = 'Hello VaultFinance';
      const encrypted = encryptField(plainText);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(plainText);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
    });

    it('should return different ciphertext for same plaintext (random IV)', () => {
      const plainText = 'Test Message';
      const encrypted1 = encryptField(plainText);
      const encrypted2 = encryptField(plainText);
      
      // Due to random IV, same plaintext produces different ciphertext
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });

    it('should throw on empty string', () => {
      expect(() => encryptField('')).toThrow('Cannot encrypt empty value');
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptField(specialChars);
      expect(encrypted).toBeDefined();
    });

    it('should handle Unicode characters', () => {
      const unicode = '₹50,000 @ 12% interest • Loan';
      const encrypted = encryptField(unicode);
      expect(encrypted).toBeDefined();
    });
  });

  describe('decryptField()', () => {
    it('should decrypt encrypted text back to original', () => {
      const plainText = 'Secret Password';
      const encrypted = encryptField(plainText);
      const decrypted = decryptField(encrypted);
      
      expect(decrypted).toBe(plainText);
    });

    it('should handle long text', () => {
      const longText = 'A'.repeat(1000);
      const encrypted = encryptField(longText);
      const decrypted = decryptField(encrypted);
      
      expect(decrypted).toBe(longText);
    });

    it('should handle JSON objects', () => {
      const obj = { name: 'John', email: 'john@test.com', phone: '9876543210' };
      const jsonStr = JSON.stringify(obj);
      const encrypted = encryptField(jsonStr);
      const decrypted = decryptField(encrypted);
      
      expect(JSON.parse(decrypted)).toEqual(obj);
    });
  });

  describe('encrypt/decrypt integrity', () => {
    it('should handle multiple encrypt/decrypt cycles', () => {
      const original = 'Test Data';
      let current = original;
      
      for (let i = 0; i < 5; i++) {
        const encrypted = encryptField(current);
        current = decryptField(encrypted);
      }
      
      expect(current).toBe(original);
    });

    it('should handle various text lengths', () => {
      const testCases = ['a', 'ab', 'abc', 'short', 'this is a medium length text'];
      
      testCases.forEach(text => {
        const encrypted = encryptField(text);
        const decrypted = decryptField(encrypted);
        expect(decrypted).toBe(text);
      });
    });
  });

  describe('maskAadhaar()', () => {
    it('should mask Aadhaar number showing only last 4 digits', () => {
      expect(maskAadhaar('123456789012')).toBe('••••-••••-9012');
    });

    it('should handle empty string', () => {
      expect(maskAadhaar('')).toBe('••••-••••-????');
    });

    it('should handle non-numeric input', () => {
      expect(maskAadhaar('abc')).toBe('••••-••••-');
    });
  });

  describe('maskPAN()', () => {
    it('should mask PAN showing first 2 and last 2 characters', () => {
      expect(maskPAN('AB12345C2F')).toBe('AB•••••2F');
    });

    it('should handle short PAN', () => {
      expect(maskPAN('AB12')).toBe('AB•••••12');
    });

    it('should handle empty string', () => {
      expect(maskPAN('')).toBe('••••••••••');
    });
  });
});