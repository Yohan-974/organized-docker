import * as tokenService from '../tokenService';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db'; // Mock this
import crypto from 'crypto';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../config/db');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'), // Import and retain default behavior
  createHash: jest.fn().mockReturnThis(), // Make createHash chainable
  update: jest.fn().mockReturnThis(),   // Make update chainable
  digest: jest.fn(),                   // Mock digest to return a specific hash
}));

// Mock environment variables (ensure these are set for the tests)
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    JWT_SECRET: 'test_jwt_secret',
    JWT_REFRESH_SECRET: 'test_jwt_refresh_secret',
    PASSWORD_RESET_TOKEN_SECRET: 'test_password_reset_secret',
    PASSWORD_RESET_TOKEN_EXPIRES_IN: '1h',
  };
  jest.clearAllMocks();

  // Reset mock for crypto.digest for each test if needed
  (crypto.digest as jest.Mock).mockReturnValue('mocked_hash_value');
});

afterEach(() => {
  process.env = originalEnv; // Restore original environment variables
});


describe('Token Service', () => {
  const userId = 'user123';
  const email = 'test@example.com';

  describe('generateAccessToken', () => {
    it('should generate an access token', () => {
      (jwt.sign as jest.Mock).mockReturnValue('mock_access_token');
      const token = tokenService.generateAccessToken(userId, email);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      expect(token).toBe('mock_access_token');
    });

    it('should throw error if JWT_SECRET is not defined', () => {
      delete process.env.JWT_SECRET;
      expect(() => tokenService.generateAccessToken(userId, email)).toThrow('JWT_SECRET is not defined');
    });
  });

  describe('generateAndStoreRefreshToken', () => {
    it('should generate a refresh token and store its hash', async () => {
      (jwt.sign as jest.Mock).mockReturnValue('mock_refresh_token');
      (query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 }); // Mock db query
      (crypto.digest as jest.Mock).mockReturnValue('hashed_refresh_token');

      const token = await tokenService.generateAndStoreRefreshToken(userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(crypto.update).toHaveBeenCalledWith('mock_refresh_token');
      expect(crypto.digest).toHaveBeenCalledWith('hex');
      expect(query).toHaveBeenCalledWith(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [userId, 'hashed_refresh_token', expect.any(Date)] // expires_at is a Date object
      );
      expect(token).toBe('mock_refresh_token');
    });
     it('should throw error if JWT_REFRESH_SECRET is not defined', async () => {
      delete process.env.JWT_REFRESH_SECRET;
      await expect(tokenService.generateAndStoreRefreshToken(userId)).rejects.toThrow('JWT_REFRESH_SECRET is not defined');
    });
  });

  describe('verifyRefreshToken', () => {
    const mockToken = 'valid_refresh_token';
    const decodedPayload = { userId: 'user123', iat: Date.now() / 1000, exp: (Date.now() / 1000) + 3600 };

    it('should verify a valid refresh token and its hash', async () => {
      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      (crypto.digest as jest.Mock).mockReturnValue('hashed_valid_token');
      (query as jest.Mock).mockResolvedValue({ rows: [{ user_id: userId }] }); // DB record exists

      const result = await tokenService.verifyRefreshToken(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_REFRESH_SECRET);
      expect(query).toHaveBeenCalledWith(
        'SELECT user_id FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() AND user_id = $2',
        ['hashed_valid_token', userId]
      );
      expect(result).toEqual({ userId });
    });

    it('should return null if token hash not found in DB or expired', async () => {
      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      (crypto.digest as jest.Mock).mockReturnValue('hashed_valid_token');
      (query as jest.Mock).mockResolvedValue({ rows: [] }); // No DB record

      const result = await tokenService.verifyRefreshToken(mockToken);
      expect(result).toBeNull();
    });

    it('should return null if jwt.verify throws an error', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('Invalid token'); });
      const result = await tokenService.verifyRefreshToken(mockToken);
      expect(result).toBeNull();
    });

    it('should throw error if JWT_REFRESH_SECRET is not defined during verification', async () => {
      delete process.env.JWT_REFRESH_SECRET;
      await expect(tokenService.verifyRefreshToken(mockToken)).rejects.toThrow('JWT_REFRESH_SECRET is not defined');
    });
  });

  describe('deleteRefreshToken', () => {
    it('should delete a refresh token by its value', async () => {
      (crypto.digest as jest.Mock).mockReturnValue('hashed_token_to_delete');
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 }); // Simulate successful deletion

      await tokenService.deleteRefreshToken('token_to_delete');

      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(crypto.update).toHaveBeenCalledWith('token_to_delete');
      expect(crypto.digest).toHaveBeenCalledWith('hex');
      expect(query).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE token_hash = $1',
        ['hashed_token_to_delete']
      );
    });
  });

  describe('deleteAllRefreshTokensForUser', () => {
    it('should delete all refresh tokens for a user', async () => {
      (query as jest.Mock).mockResolvedValue({ rowCount: 3 }); // Simulate deleting 3 tokens

      await tokenService.deleteAllRefreshTokensForUser(userId);

      expect(query).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE user_id = $1',
        [userId]
      );
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate a password reset token', () => {
      (jwt.sign as jest.Mock).mockReturnValue('mock_password_reset_token');
      const token = tokenService.generatePasswordResetToken(userId);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, type: 'password_reset' },
        process.env.PASSWORD_RESET_TOKEN_SECRET,
        { expiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN }
      );
      expect(token).toBe('mock_password_reset_token');
    });
    it('should throw error if PASSWORD_RESET_TOKEN_SECRET is not defined', () => {
      delete process.env.PASSWORD_RESET_TOKEN_SECRET;
      expect(() => tokenService.generatePasswordResetToken(userId)).toThrow('PASSWORD_RESET_TOKEN_SECRET is not defined');
    });
    it('should throw error if PASSWORD_RESET_TOKEN_EXPIRES_IN is not defined', () => {
      delete process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN;
      expect(() => tokenService.generatePasswordResetToken(userId)).toThrow('PASSWORD_RESET_TOKEN_EXPIRES_IN is not defined');
    });
  });

  describe('verifyPasswordResetToken', () => {
    const mockResetToken = 'valid_reset_token_string';
    const decodedResetPayload = { userId, type: 'password_reset' as const }; // Ensure type is literal

    it('should verify a valid password reset token', () => {
      (jwt.verify as jest.Mock).mockReturnValue(decodedResetPayload);
      const result = tokenService.verifyPasswordResetToken(mockResetToken);
      expect(jwt.verify).toHaveBeenCalledWith(mockResetToken, process.env.PASSWORD_RESET_TOKEN_SECRET);
      expect(result).toEqual(decodedResetPayload);
    });

    it('should return null if token type is incorrect', () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId, type: 'access_token' }); // Wrong type
      const result = tokenService.verifyPasswordResetToken(mockResetToken);
      expect(result).toBeNull();
    });

    it('should return null if jwt.verify throws an error for password reset token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('Invalid reset token'); });
      const result = tokenService.verifyPasswordResetToken(mockResetToken);
      expect(result).toBeNull();
    });
     it('should throw error if PASSWORD_RESET_TOKEN_SECRET is not defined for verification', () => {
      delete process.env.PASSWORD_RESET_TOKEN_SECRET;
      expect(() => tokenService.verifyPasswordResetToken(mockResetToken)).toThrow('PASSWORD_RESET_TOKEN_SECRET is not defined');
    });
  });
});
