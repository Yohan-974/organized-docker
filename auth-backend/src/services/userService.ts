import { query } from '../config/db';
import bcrypt from 'bcrypt';

// User type - adjust as per your actual user model, excluding sensitive data like password
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserWithPassword extends User {
  hashed_password?: string;
}

export const findUserByEmail = async (email: string): Promise<UserWithPassword | null> => {
  const { rows } = await query<UserWithPassword>('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
};

export const createUser = async (email: string, password: string, fullName: string): Promise<User> => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const { rows } = await query<User>(
    'INSERT INTO users (email, hashed_password, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, avatar_url, is_active, created_at, updated_at',
    [email, hashedPassword, fullName]
  );
  return rows[0];
};

export const findUserById = async (userId: string): Promise<User | null> => {
  const { rows } = await query<User>('SELECT id, email, full_name, avatar_url, is_active, created_at, updated_at FROM users WHERE id = $1', [userId]);
  return rows[0] || null;
};

export const findOrCreateUserByOAuth = async (
  providerName: string,
  providerUserId: string,
  email: string,
  fullName?: string,
  avatarUrl?: string
): Promise<User | null> => {
  // 1. Check if OAuth identity already exists
  let { rows: oauthRows } = await query(
    'SELECT user_id FROM user_oauth_identities WHERE provider_name = $1 AND provider_user_id = $2',
    [providerName, providerUserId]
  );

  if (oauthRows.length > 0) {
    // OAuth identity exists, fetch and return the associated user
    const existingUserId = oauthRows[0].user_id;
    return findUserById(existingUserId);
  }

  // 2. OAuth identity does not exist. Check if a user with the same email exists.
  let user = await findUserByEmail(email);

  if (user) {
    // User with this email exists. Link this OAuth identity to the existing user.
    // Note: findUserByEmail returns UserWithPassword, we need just User.id
    const existingUser = await findUserById(user.id); // Fetch as User to ensure we have the correct type
    if (!existingUser) {
        // This should ideally not happen if findUserByEmail found someone
        console.error(`User with email ${email} found by findUserByEmail but not by findUserById(${user.id})`);
        return null;
    }
    await query(
      'INSERT INTO user_oauth_identities (user_id, provider_name, provider_user_id) VALUES ($1, $2, $3)',
      [existingUser.id, providerName, providerUserId]
    );
    return existingUser; // Return the existing user
  } else {
    // 3. No existing user with this email. Create a new user AND link the OAuth identity.
    // Start a transaction
    await query('BEGIN');
    try {
      const { rows: newUserRows } = await query<User>(
        'INSERT INTO users (email, full_name, avatar_url, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id, email, full_name, avatar_url, is_active, created_at, updated_at',
        [email, fullName, avatarUrl]
      );
      const newInternalUser = newUserRows[0];

      if (!newInternalUser) {
        throw new Error('Failed to create new user.');
      }

      await query(
        'INSERT INTO user_oauth_identities (user_id, provider_name, provider_user_id) VALUES ($1, $2, $3)',
        [newInternalUser.id, providerName, providerUserId]
      );

      await query('COMMIT');
      return newInternalUser;
    } catch (error) {
      await query('ROLLBACK');
      console.error('Transaction failed in findOrCreateUserByOAuth:', error);
      return null;
    }
  }
};

export const updateUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  try {
    const { rowCount } = await query(
      'UPDATE users SET hashed_password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );
    return rowCount === 1;
  } catch (error) {
    console.error(`Error updating password for user ${userId}:`, error);
    return false;
  }
};
