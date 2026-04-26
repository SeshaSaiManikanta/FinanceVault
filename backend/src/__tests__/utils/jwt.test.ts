// filepath: vaultfinance/backend/src/__tests__/utils/jwt.test.ts
import { generateAccessToken, verifyAccessToken, generateRefreshTokenValue } from '../../utils/jwt';

describe('JWT Utility', () => {
  // Set up environment for tests
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'dev_access_secret_change_in_production_min_64_chars_xxxxxxxxxxxxxxxx';
    process.env.JWT_REFRESH_SECRET = 'dev_refresh_secret_change_in_production_min_64_chars_xxxxxxxxxxxxxxx';
  });

  describe('generateAccessToken()', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'USER'
      };
      
      const token = generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', () => {
      const payload1 = { userId: 'user1', email: 'user1@test.com', role: 'USER' };
      const payload2 = { userId: 'user2', email: 'user2@test.com', role: 'USER' };
      
      const token1 = generateAccessToken(payload1);
      const token2 = generateAccessToken(payload2);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyAccessToken()', () => {
    it('should verify a valid token', () => {
      const payload = { userId: 'user123', email: 'test@example.com', role: 'USER' };
      const token = generateAccessToken(payload);
      
      const result = verifyAccessToken(token);
      
      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('USER');
    });

    it('should throw for tampered token', () => {
      const payload = { userId: 'user123', email: 'test@example.com', role: 'USER' };
      const token = generateAccessToken(payload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      expect(() => verifyAccessToken(tamperedToken)).toThrow('TOKEN_INVALID');
    });

    it('should throw for empty token', () => {
      expect(() => verifyAccessToken('')).toThrow('TOKEN_INVALID');
    });

    it('should throw for random string', () => {
      expect(() => verifyAccessToken('random.invalid.token')).toThrow('TOKEN_INVALID');
    });
  });

  describe('generateRefreshTokenValue()', () => {
    it('should generate a random token', () => {
      const token1 = generateRefreshTokenValue();
      const token2 = generateRefreshTokenValue();
      
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
    });

    it('should generate token of sufficient length', () => {
      const token = generateRefreshTokenValue();
      
      expect(token.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('Token payload', () => {
    it('should include userId in token payload', () => {
      const payload = { userId: 'testUserId', email: 'test@test.com', role: 'USER' };
      const token = generateAccessToken(payload);
      const result = verifyAccessToken(token);
      
      expect(result.userId).toBe('testUserId');
    });

    it('should include email in token payload', () => {
      const payload = { userId: 'user123', email: 'test@example.com', role: 'USER' };
      const token = generateAccessToken(payload);
      const result = verifyAccessToken(token);
      
      expect(result.email).toBe('test@example.com');
    });

    it('should include role in token payload', () => {
      const payload = { userId: 'user123', email: 'test@example.com', role: 'ADMIN' };
      const token = generateAccessToken(payload);
      const result = verifyAccessToken(token);
      
      expect(result.role).toBe('ADMIN');
    });
  });
});