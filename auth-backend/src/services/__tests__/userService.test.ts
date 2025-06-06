import * as userService from '../userService';
import { query } from '../../config/db'; // Mock this
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('../../config/db');
jest.mock('bcrypt');

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findUserByEmail', () => {
    it('should return user if found', async () => {
      const mockUser = { id: '1', email: 'test@example.com', hashed_password: 'hash' };
      (query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      const user = await userService.findUserByEmail('test@example.com');
      expect(query).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1', ['test@example.com']);
      expect(user).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });
      const user = await userService.findUserByEmail('test@example.com');
      expect(user).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create and return a new user', async () => {
      const mockNewUser = { id: '1', email: 'new@example.com', full_name: 'New User' };
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password_new');
      (query as jest.Mock).mockResolvedValue({ rows: [mockNewUser] });

      const user = await userService.createUser('new@example.com', 'password123', 'New User');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(query).toHaveBeenCalledWith(
        'INSERT INTO users (email, hashed_password, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, avatar_url, is_active, created_at, updated_at',
        ['new@example.com', 'hashed_password_new', 'New User']
      );
      expect(user).toEqual(mockNewUser);
    });
  });

  describe('findUserById', () => {
    it('should return user if found by ID', async () => {
      const mockUser = { id: '1', email: 'test@example.com', full_name: 'Test User' };
      (query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      const user = await userService.findUserById('1');
      expect(query).toHaveBeenCalledWith('SELECT id, email, full_name, avatar_url, is_active, created_at, updated_at FROM users WHERE id = $1', ['1']);
      expect(user).toEqual(mockUser);
    });

    it('should return null if user not found by ID', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });
      const user = await userService.findUserById('1');
      expect(user).toBeNull();
    });
  });

  describe('findOrCreateUserByOAuth', () => {
    const oAuthDetails = {
      providerName: 'google',
      providerUserId: 'google_id_123',
      email: 'oauth@example.com',
      fullName: 'OAuth User',
      avatarUrl: 'http://avatar.url',
    };
    const mockExistingUser = { id: 'existing_user_id', email: oAuthDetails.email, full_name: oAuthDetails.fullName };

    it('should return existing user if OAuth identity exists', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ user_id: 'existing_user_id' }] }) // First query for oauth identity
        .mockResolvedValueOnce({ rows: [mockExistingUser] }); // Second query for findUserById

      const user = await userService.findOrCreateUserByOAuth(
        oAuthDetails.providerName, oAuthDetails.providerUserId, oAuthDetails.email, oAuthDetails.fullName, oAuthDetails.avatarUrl
      );

      expect(query).toHaveBeenCalledWith(
        'SELECT user_id FROM user_oauth_identities WHERE provider_name = $1 AND provider_user_id = $2',
        [oAuthDetails.providerName, oAuthDetails.providerUserId]
      );
      expect(userService.findUserById).toHaveBeenCalledWith('existing_user_id'); // This is a mock if userService itself is partially mocked. Or check query directly for findUserById.
      expect(user).toEqual(mockExistingUser);
    });

    // To properly test findUserById call within findOrCreateUserByOAuth when it's not a separate mock,
    // we ensure the second 'query' call for findUserById is as expected.
     it('should return existing user if OAuth identity exists (checking direct query for findUserById)', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ user_id: 'existing_user_id' }] }) // For OAuth identity check
        .mockResolvedValueOnce({ rows: [mockExistingUser] }); // For findUserById call

      const user = await userService.findOrCreateUserByOAuth(
        oAuthDetails.providerName, oAuthDetails.providerUserId, oAuthDetails.email, oAuthDetails.fullName, oAuthDetails.avatarUrl
      );
      expect(query).toHaveBeenNthCalledWith(1, 'SELECT user_id FROM user_oauth_identities WHERE provider_name = $1 AND provider_user_id = $2', [oAuthDetails.providerName, oAuthDetails.providerUserId]);
      expect(query).toHaveBeenNthCalledWith(2, 'SELECT id, email, full_name, avatar_url, is_active, created_at, updated_at FROM users WHERE id = $1', ['existing_user_id']);
      expect(user).toEqual(mockExistingUser);
    });


    it('should link to existing user if email matches and create OAuth identity', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // No existing OAuth identity
        .mockResolvedValueOnce({ rows: [mockExistingUser] }) // Existing user by email
        .mockResolvedValueOnce({ rows: [mockExistingUser] }) // findUserById call for the existing user
        .mockResolvedValueOnce({ rows: [] }); // For INSERT into user_oauth_identities

      const user = await userService.findOrCreateUserByOAuth(
         oAuthDetails.providerName, oAuthDetails.providerUserId, oAuthDetails.email, oAuthDetails.fullName, oAuthDetails.avatarUrl
      );

      expect(query).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1', [oAuthDetails.email]);
      expect(query).toHaveBeenCalledWith('INSERT INTO user_oauth_identities (user_id, provider_name, provider_user_id) VALUES ($1, $2, $3)',
        [mockExistingUser.id, oAuthDetails.providerName, oAuthDetails.providerUserId]
      );
      expect(user).toEqual(mockExistingUser);
    });

    it('should create new user and OAuth identity if no existing user or identity', async () => {
      const newCreatedUser = { ...mockExistingUser, id: 'new_oauth_user_id'};
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // No existing OAuth identity
        .mockResolvedValueOnce({ rows: [] }) // No existing user by email
        .mockResolvedValueOnce({}) // BEGIN transaction
        .mockResolvedValueOnce({ rows: [newCreatedUser] }) // INSERT new user
        .mockResolvedValueOnce({ rows: [] }) // INSERT new OAuth identity
        .mockResolvedValueOnce({}); // COMMIT transaction


      const user = await userService.findOrCreateUserByOAuth(
         oAuthDetails.providerName, oAuthDetails.providerUserId, oAuthDetails.email, oAuthDetails.fullName, oAuthDetails.avatarUrl
      );

      expect(query).toHaveBeenCalledWith(
        'INSERT INTO users (email, full_name, avatar_url, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id, email, full_name, avatar_url, is_active, created_at, updated_at',
        [oAuthDetails.email, oAuthDetails.fullName, oAuthDetails.avatarUrl]
      );
      expect(query).toHaveBeenCalledWith(
        'INSERT INTO user_oauth_identities (user_id, provider_name, provider_user_id) VALUES ($1, $2, $3)',
        [newCreatedUser.id, oAuthDetails.providerName, oAuthDetails.providerUserId]
      );
      expect(user).toEqual(newCreatedUser);
    });
  });

  describe('updateUserPassword', () => {
    it('should update user password and return true on success', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const success = await userService.updateUserPassword('1', 'newPassword123');

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(query).toHaveBeenCalledWith(
        'UPDATE users SET hashed_password = $1, updated_at = NOW() WHERE id = $2',
        ['new_hashed_password', '1']
      );
      expect(success).toBe(true);
    });

    it('should return false if update fails (rowCount is 0)', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      (query as jest.Mock).mockResolvedValue({ rowCount: 0 });
      const success = await userService.updateUserPassword('1', 'newPassword123');
      expect(success).toBe(false);
    });

    it('should return false if database query throws error', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      (query as jest.Mock).mockRejectedValue(new Error('DB error'));
      const success = await userService.updateUserPassword('1', 'newPassword123');
      expect(success).toBe(false);
    });
  });
});
