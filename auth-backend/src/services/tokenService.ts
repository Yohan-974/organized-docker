import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import crypto from 'crypto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

// Generates a JWT access token
export const generateAccessToken = (userId: string, email: string): string => {
  const payload: AccessTokenPayload = { userId, email };
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
};

// Generates a JWT refresh token and stores its hash in the database
export const generateAndStoreRefreshToken = async (userId: string): Promise<string> => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, sevenDaysFromNow]
  );

  return refreshToken;
};

// Verifies a refresh token and its hash (example, more robust validation might be needed)
export const verifyRefreshToken = async (token: string): Promise<{ userId: string } | null> => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET) as { userId: string, iat: number, exp: number };
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { rows } = await query(
      'SELECT user_id FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() AND user_id = $2',
      [tokenHash, decoded.userId]
    );

    if (rows.length > 0) {
      return { userId: decoded.userId };
    }
    return null;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
};

// Deletes a refresh token by its value (used for logout)
export const deleteRefreshToken = async (token: string): Promise<void> => {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
};

// Deletes all refresh tokens for a user (e.g., if password changes or "logout from all devices")
export const deleteAllRefreshTokensForUser = async (userId: string): Promise<void> => {
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
};

// Password Reset Token
export interface PasswordResetTokenPayload {
  userId: string;
  type: 'password_reset'; // To differentiate from access tokens if same secret were used (not recommended)
}

export const generatePasswordResetToken = (userId: string): string => {
  if (!process.env.PASSWORD_RESET_TOKEN_SECRET) {
    throw new Error('PASSWORD_RESET_TOKEN_SECRET is not defined');
  }
  if (!process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN) {
    throw new Error('PASSWORD_RESET_TOKEN_EXPIRES_IN is not defined');
  }
  const payload: PasswordResetTokenPayload = { userId, type: 'password_reset' };
  return jwt.sign(payload, process.env.PASSWORD_RESET_TOKEN_SECRET, {
    expiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN,
  });
};

export const verifyPasswordResetToken = (token: string): PasswordResetTokenPayload | null => {
  if (!process.env.PASSWORD_RESET_TOKEN_SECRET) {
    throw new Error('PASSWORD_RESET_TOKEN_SECRET is not defined');
  }
  try {
    const decoded = jwt.verify(token, process.env.PASSWORD_RESET_TOKEN_SECRET) as PasswordResetTokenPayload;
    if (decoded.type !== 'password_reset') {
      console.warn('Invalid token type used for password reset verification.');
      return null; // Not a password reset token
    }
    return decoded;
  } catch (error) {
    console.error('Password reset token verification failed:', error);
    return null;
  }
};
