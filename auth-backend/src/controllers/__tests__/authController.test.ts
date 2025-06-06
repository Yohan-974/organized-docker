import { Request, Response } from 'express';
import * as authController from '../authController';
import * as userService from '../../services/userService';
import * as tokenService from '../../services/tokenService';
import bcrypt from 'bcrypt';
import oauth2Client from '../../config/oauth'; // For Google OAuth
import config from '../../config'; // For FRONTEND_URL in Google OAuth

// Mock services
jest.mock('../../services/userService');
jest.mock('../../services/tokenService');
jest.mock('bcrypt');
jest.mock('../../config/oauth'); // Mock the oauth2Client
jest.mock('../../config', () => ({ // Mock the config for FRONTEND_URL
  __esModule: true,
  default: {
    frontendUrl: 'http://localhost:3000',
    // Add other config properties if they are used directly in controller and need mocking
  },
}));


// Mock Express Request and Response objects
const mockRequest = (body: any = {}, query: any = {}, params: any = {}, user: any = undefined, headers: any = {}) => {
  const req = {} as Request;
  req.body = body;
  req.query = query;
  req.params = params;
  req.user = user; // For authMiddleware testing context
  req.headers = headers;
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res); // For Google OAuth redirects
  res.send = jest.fn().mockReturnValue(res); // If any controller uses send
  return res;
};

describe('Auth Controller', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });

  // --- Registration Tests ---
  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      req = mockRequest({ email: 'test@example.com', password: 'password123', fullName: 'Test User' });
      res = mockResponse();
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
      const mockNewUser = { id: '1', email: 'test@example.com', fullName: 'Test User' };
      (userService.createUser as jest.Mock).mockResolvedValue(mockNewUser);
      (tokenService.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (tokenService.generateAndStoreRefreshToken as jest.Mock).mockResolvedValue('refresh_token');

      await authController.registerUser(req, res);

      expect(userService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userService.createUser).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith('1', 'test@example.com');
      expect(tokenService.generateAndStoreRefreshToken).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User registered successfully',
        user: mockNewUser,
        tokens: { accessToken: 'access_token', refreshToken: 'refresh_token' },
      }));
    });

    it('should return 409 if email already exists', async () => {
      req = mockRequest({ email: 'test@example.com', password: 'password123', fullName: 'Test User' });
      res = mockResponse();
      (userService.findUserByEmail as jest.Mock).mockResolvedValue({ id: '1', email: 'test@example.com' });

      await authController.registerUser(req, res);

      expect(userService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userService.createUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'User with this email already exists' });
    });

    it('should return 400 if required fields are missing', async () => {
      req = mockRequest({ email: 'test@example.com' }); // Missing password and fullName
      res = mockResponse();
      await authController.registerUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email, password, and full name are required' });
    });
  });

  // --- Login Tests ---
  describe('loginUser', () => {
    const mockUser = { id: '1', email: 'test@example.com', hashed_password: 'hashed_password' };
    it('should login user successfully', async () => {
      req = mockRequest({ email: 'test@example.com', password: 'password123' });
      res = mockResponse();
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (tokenService.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (tokenService.generateAndStoreRefreshToken as jest.Mock).mockResolvedValue('refresh_token');
      const { hashed_password, ...userWithoutPassword } = mockUser;


      await authController.loginUser(req, res);

      expect(userService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith('1', 'test@example.com');
      expect(tokenService.generateAndStoreRefreshToken).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User logged in successfully',
        user: userWithoutPassword,
        tokens: { accessToken: 'access_token', refreshToken: 'refresh_token' },
      }));
    });

    it('should return 401 if user not found', async () => {
      req = mockRequest({ email: 'test@example.com', password: 'password123' });
      res = mockResponse();
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
      await authController.loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
    });

    it('should return 401 if password does not match', async () => {
      req = mockRequest({ email: 'test@example.com', password: 'wrong_password' });
      res = mockResponse();
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await authController.loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
    });
  });

  // --- Get Current User (Me) Tests ---
  describe('getCurrentUser', () => {
    it('should return current user if authenticated', async () => {
      const mockUser = { id: '1', email: 'test@example.com', fullName: 'Test User' };
      // Simulate authenticated request (req.user populated by authMiddleware)
      req = mockRequest({}, {}, {}, { userId: '1', email: 'test@example.com' });
      res = mockResponse();
      (userService.findUserById as jest.Mock).mockResolvedValue(mockUser);

      await authController.getCurrentUser(req, res);

      expect(userService.findUserById).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
    });

    it('should return 404 if user not found for token', async () => {
      req = mockRequest({}, {}, {}, { userId: '1', email: 'test@example.com' });
      res = mockResponse();
      (userService.findUserById as jest.Mock).mockResolvedValue(null);
      await authController.getCurrentUser(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
     // Test for req.user missing is implicitly covered by authMiddleware tests.
     // If authMiddleware fails to populate req.user, getCurrentUser won't be called,
     // or if it is (e.g. middleware not applied to route), it would fail differently.
     // For this unit test, we assume middleware has run or check for req.user.
    it('should return 401 if req.user is not populated', async () => {
        req = mockRequest(); // No req.user
        res = mockResponse();
        await authController.getCurrentUser(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });
  });

  // --- Logout Tests ---
  describe('logout', () => {
    it('should logout user successfully', async () => {
      req = mockRequest({ refreshToken: 'some_refresh_token' });
      res = mockResponse();
      (tokenService.deleteRefreshToken as jest.Mock).mockResolvedValue(undefined);

      await authController.logout(req, res);

      expect(tokenService.deleteRefreshToken).toHaveBeenCalledWith('some_refresh_token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should return 400 if refresh token is missing', async () => {
      req = mockRequest({}); // Missing refreshToken
      res = mockResponse();
      await authController.logout(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Refresh token is required' });
    });
  });

  // --- Google OAuth Tests ---
  describe('googleOAuthStart', () => {
    it('should redirect to Google OAuth URL', () => {
      req = mockRequest();
      res = mockResponse();
      const mockAuthUrl = 'https://google.com/oauth/authorize';
      (oauth2Client.generateAuthUrl as jest.Mock).mockReturnValue(mockAuthUrl);

      authController.googleOAuthStart(req, res);

      expect(oauth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: expect.any(Array), // Assuming googleOAuthScopes is an array
      });
      expect(res.redirect).toHaveBeenCalledWith(mockAuthUrl);
    });
  });

  describe('googleOAuthCallback', () => {
    const mockGoogleTokens = { access_token: 'google_access_token', refresh_token: 'google_refresh_token' };
    const mockGoogleProfile = {
      emailAddresses: [{ value: 'googleuser@example.com' }],
      names: [{ displayName: 'Google User' }],
      photos: [{ url: 'http://avatar.url' }],
      resourceName: 'people/google_id_123',
    };
    const mockInternalUser = { id: 'internal_user_id', email: 'googleuser@example.com', fullName: 'Google User' };

    it('should handle successful Google OAuth callback and redirect with tokens', async () => {
      req = mockRequest({}, { code: 'auth_code' });
      res = mockResponse();
      (oauth2Client.getToken as jest.Mock).mockResolvedValue({ tokens: mockGoogleTokens });
      (google.people as jest.Mock).mockReturnValue({
        people: { get: jest.fn().mockResolvedValue({ data: mockGoogleProfile }) },
      } as any); // Mocking the googleapis structure
      (userService.findOrCreateUserByOAuth as jest.Mock).mockResolvedValue(mockInternalUser);
      (tokenService.generateAccessToken as jest.Mock).mockReturnValue('app_access_token');
      (tokenService.generateAndStoreRefreshToken as jest.Mock).mockResolvedValue('app_refresh_token');

      await authController.googleOAuthCallback(req, res);

      expect(oauth2Client.getToken).toHaveBeenCalledWith('auth_code');
      expect(oauth2Client.setCredentials).toHaveBeenCalledWith(mockGoogleTokens);
      expect(userService.findOrCreateUserByOAuth).toHaveBeenCalledWith(
        'google', 'google_id_123', 'googleuser@example.com', 'Google User', 'http://avatar.url'
      );
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith('internal_user_id', 'googleuser@example.com');
      expect(tokenService.generateAndStoreRefreshToken).toHaveBeenCalledWith('internal_user_id');
      expect(res.redirect).toHaveBeenCalledWith(
        `${config.frontendUrl}/oauth-callback?access_token=app_access_token&refresh_token=app_refresh_token`
      );
    });

    it('should redirect to error page if Google returns an error', async () => {
      req = mockRequest({}, { error: 'access_denied' });
      res = mockResponse();
      await authController.googleOAuthCallback(req, res);
      expect(res.redirect).toHaveBeenCalledWith(
        `${config.frontendUrl}/login?error=oauth_failed&message=access_denied`
      );
    });
     it('should redirect to error page if code is missing', async () => {
      req = mockRequest({}, {}); // No code
      res = mockResponse();
      await authController.googleOAuthCallback(req, res);
      expect(res.redirect).toHaveBeenCalledWith(
        `${config.frontendUrl}/login?error=oauth_failed&message=authorization_code_missing_or_invalid`
      );
    });
  });

  // --- Password Reset Tests ---
  describe('requestPasswordReset', () => {
    it('should return 200 if email exists and simulate email sending', async () => {
      req = mockRequest({ email: 'test@example.com' });
      res = mockResponse();
      (userService.findUserByEmail as jest.Mock).mockResolvedValue({ id: '1', email: 'test@example.com' });
      (tokenService.generatePasswordResetToken as jest.Mock).mockReturnValue('reset_token_123');

      await authController.requestPasswordReset(req, res);

      expect(userService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(tokenService.generatePasswordResetToken).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'If your email is registered, you will receive a password reset link.' });
    });

    it('should return 200 even if email does not exist (to prevent email enumeration)', async () => {
      req = mockRequest({ email: 'nonexistent@example.com' });
      res = mockResponse();
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
      await authController.requestPasswordReset(req, res);
      expect(userService.findUserByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      expect(tokenService.generatePasswordResetToken).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'If your email is registered, you will receive a password reset link.' });
    });
  });

  describe('resetPassword', () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    const mockUserWithPassword = { ...mockUser, hashed_password: 'some_hash' };


    it('should reset password successfully with a valid token', async () => {
      req = mockRequest({ token: 'valid_reset_token', newPassword: 'newPassword123' });
      res = mockResponse();
      (tokenService.verifyPasswordResetToken as jest.Mock).mockReturnValue({ userId: '1', type: 'password_reset' });
      (userService.findUserById as jest.Mock).mockResolvedValue(mockUser); // User exists
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(mockUserWithPassword); // User has a password
      (userService.updateUserPassword as jest.Mock).mockResolvedValue(true);
      (tokenService.deleteAllRefreshTokensForUser as jest.Mock).mockResolvedValue(undefined);

      await authController.resetPassword(req, res);

      expect(tokenService.verifyPasswordResetToken).toHaveBeenCalledWith('valid_reset_token');
      expect(userService.updateUserPassword).toHaveBeenCalledWith('1', 'newPassword123');
      expect(tokenService.deleteAllRefreshTokensForUser).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password has been reset successfully' });
    });

    it('should return 401 if token is invalid or expired', async () => {
      req = mockRequest({ token: 'invalid_token', newPassword: 'newPassword123' });
      res = mockResponse();
      (tokenService.verifyPasswordResetToken as jest.Mock).mockReturnValue(null);
      await authController.resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired password reset token' });
    });

    it('should return 400 if password is too short', async () => {
      req = mockRequest({ token: 'valid_reset_token', newPassword: '123' });
      res = mockResponse();
      await authController.resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password must be at least 6 characters long' });
    });

    it('should return 400 for OAuth user without a set password', async () => {
        req = mockRequest({ token: 'valid_reset_token', newPassword: 'newPassword123' });
        res = mockResponse();
        (tokenService.verifyPasswordResetToken as jest.Mock).mockReturnValue({ userId: '1', type: 'password_reset' });
        (userService.findUserById as jest.Mock).mockResolvedValue(mockUser); // User exists
        (userService.findUserByEmail as jest.Mock).mockResolvedValue({ ...mockUser, hashed_password: null }); // User has NO password (OAuth only)

        await authController.resetPassword(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Password reset is not applicable for OAuth users without a set password.' });
    });
  });

});

// Helper to mock googleapis for the googleOAuthCallback test
const google = {
  people: jest.fn(),
};
jest.mock('googleapis', () => ({
  google,
}));
