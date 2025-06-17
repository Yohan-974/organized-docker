import { Request, Response } from 'express';
import * as userService from '../services/userService';
import * as tokenService from '../services/tokenService';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middlewares/authMiddleware'; // Ensure this path is correct

export const registerUser = async (req: Request, res: Response) => {
  const { email, password, fullName } = req.body;

  // 1. Validate input
  if (!email || !password || !fullName) {
    return res.status(400).json({ message: 'Email, password, and full name are required' });
  }
  // Basic email validation
  if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
  }
  // Basic password length validation (example)
  if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    // 2. Check if user exists
    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // 3. Create user (userService handles password hashing)
    const newUser = await userService.createUser(email, password, fullName);

    // 4. Generate tokens
    const accessToken = tokenService.generateAccessToken(newUser.id, newUser.email);
    const refreshToken = await tokenService.generateAndStoreRefreshToken(newUser.id);

    // 5. Return user and tokens
    const { ...userWithoutPassword } = newUser; // Or explicitly pick fields
    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Check for specific error types if needed, e.g., database connection errors
    if (error instanceof Error && error.message.includes('database')) { // Example check
        return res.status(503).json({ message: 'Database service unavailable. Please try again later.' });
    }
    res.status(500).json({ message: 'Internal server error during registration' });
  }
};

// Password Reset Controller Functions
export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await userService.findUserByEmail(email);

    if (user) {
      // User exists, generate token and simulate email sending
      const resetToken = tokenService.generatePasswordResetToken(user.id);
      const resetLink = `${config.frontendUrl}/reset-password?token=${resetToken}`;

      // Simulate sending email
      console.log(`Password reset requested for ${email}. Reset link: ${resetLink}`);
      // In a real application, you would use an email service here:
      // await emailService.sendPasswordResetEmail(email, resetLink);
    } else {
      // User does not exist, still log for monitoring but send generic message
      console.log(`Password reset requested for non-existent email: ${email}`);
    }

    // Always return a generic success message to avoid leaking information about existing users
    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link.' });

  } catch (error: any) {
    console.error('Request password reset error:', error);
    if (error.message.includes('PASSWORD_RESET_TOKEN_SECRET') || error.message.includes('FRONTEND_URL')) {
        return res.status(500).json({ message: 'Server configuration error. Please try again later.' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  // Basic password validation (example)
  if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const decodedToken = tokenService.verifyPasswordResetToken(token);

    if (!decodedToken) {
      return res.status(401).json({ message: 'Invalid or expired password reset token' });
    }

    const { userId } = decodedToken;

    // Ensure user still exists (optional, but good practice)
    const user = await userService.findUserById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found for the provided token.' });
    }

    // User can't reset password if they are registered via OAuth and don't have a password
    const userWithPassword = await userService.findUserByEmail(user.email);
    if (userWithPassword && !userWithPassword.hashed_password) {
        return res.status(400).json({ message: 'Password reset is not applicable for OAuth users without a set password.' });
    }


    const success = await userService.updateUserPassword(userId, newPassword);

    if (success) {
      // Optionally, invalidate all existing refresh tokens for the user for security
      await tokenService.deleteAllRefreshTokensForUser(userId);
      res.status(200).json({ message: 'Password has been reset successfully' });
    } else {
      res.status(500).json({ message: 'Failed to update password' });
    }
  } catch (error: any) {
    console.error('Reset password error:', error);
    if (error.message.includes('PASSWORD_RESET_TOKEN_SECRET')) {
        return res.status(500).json({ message: 'Server configuration error. Please try again later.' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    // 2. Retrieve user
    const user = await userService.findUserByEmail(email);
    if (!user || !user.hashed_password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.hashed_password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 4. Generate tokens
    const accessToken = tokenService.generateAccessToken(user.id, user.email);
    const refreshToken = await tokenService.generateAndStoreRefreshToken(user.id);

    // 5. Return user and tokens
    const { hashed_password, ...userWithoutPassword } = user;
    res.status(200).json({
      message: 'User logged in successfully',
      user: userWithoutPassword,
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error && error.message.includes('database')) {
        return res.status(503).json({ message: 'Database service unavailable. Please try again later.' });
    }
    res.status(500).json({ message: 'Internal server error during login' });
  }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  // req.user is populated by authMiddleware
  if (!req.user) {
    // This case should ideally be caught by the middleware, but as a safeguard:
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const user = await userService.findUserById(req.user.userId);
    if (!user) {
      // This might happen if the user was deleted after the token was issued
      return res.status(404).json({ message: 'User not found' });
    }
    // User object from userService.findUserById already excludes password
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    if (error instanceof Error && error.message.includes('database')) {
        return res.status(503).json({ message: 'Database service unavailable. Please try again later.' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Placeholder for token refresh, if you were to implement it in this controller
export const refreshToken = async (req: Request, res: Response) => {
    const { token: oldRefreshToken } = req.body;
    if (!oldRefreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }

    try {
        const verifiedPayload = await tokenService.verifyRefreshToken(oldRefreshToken);
        if (!verifiedPayload) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        const user = await userService.findUserById(verifiedPayload.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found for refresh token' });
        }

        // Generate new tokens
        const newAccessToken = tokenService.generateAccessToken(user.id, user.email);
        // Optionally, generate a new refresh token (and invalidate the old one if single-use)
        // For simplicity, let's assume the old refresh token can be reused until expiry,
        // but best practice often involves rotating refresh tokens.
        // const newRefreshToken = await tokenService.generateAndStoreRefreshToken(user.id);
        // await tokenService.deleteRefreshToken(oldRefreshToken); // If rotating

        res.status(200).json({
            accessToken: newAccessToken,
            // refreshToken: newRefreshToken // if rotating
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        if (error instanceof Error && error.message.includes('JWT_REFRESH_SECRET')) {
            return res.status(500).json({ message: 'Server configuration error for token refresh.' });
        }
        res.status(500).json({ message: 'Internal server error during token refresh' });
    }
};

export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    // The tokenService.deleteRefreshToken expects the actual token string.
    // It will hash it internally before querying the database.
    await tokenService.deleteRefreshToken(refreshToken);
    res.status(200).json({ message: 'Logged out successfully' });
    // Or use 204 No Content, but then you cannot send a JSON message
    // res.status(204).send();
  } catch (error) {
    console.error('Logout error:', error);
    // It's unlikely deleteRefreshToken itself would throw an error unless DB is down.
    // If it does, a generic 500 is appropriate.
    res.status(500).json({ message: 'Internal server error during logout' });
  }
};

// Google OAuth Controller Functions
import oauth2Client, { googleOAuthScopes } from '../config/oauth'; // Adjust path as needed
import { OAuth2Client } from 'google-auth-library';
import config from '../config'; // For FRONTEND_URL

export const googleOAuthStart = (req: Request, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // 'offline' gets a refresh token
    scope: googleOAuthScopes,
  });
  res.redirect(url);
};

export const googleOAuthCallback = async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error) {
    console.error('Google OAuth error:', error);
    return res.status(400).json({ message: 'Google OAuth error', error });
    // Or redirect to a frontend error page:
    // return res.redirect(`${config.frontendUrl}/oauth-error?message=Google_OAuth_Error`);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Authorization code missing or invalid' });
    // Or redirect:
    // return res.redirect(`${config.frontendUrl}/oauth-error?message=Authorization_Code_Missing`);
  }

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens); // Use this specific client instance for future API calls

    // Fetch user profile from Google
    const googlePeople = google.people({ version: 'v1', auth: oauth2Client as any }); // Cast to any to satisfy googleapis type issue
    const profileResponse = await googlePeople.people.get({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,photos',
    });

    const googleProfile = profileResponse.data;
    const email = googleProfile.emailAddresses?.[0]?.value;
    const fullName = googleProfile.names?.[0]?.displayName;
    const avatarUrl = googleProfile.photos?.[0]?.url;
    const googleId = googleProfile.resourceName?.replace('people/', ''); // Or use another stable ID if available

    if (!email || !googleId) {
      console.error('Failed to retrieve email or Google ID from Google profile');
      return res.redirect(`${config.frontendUrl}/login?error=oauth_failed&message=profile_data_missing`);
    }

    // Find or create user
    const user = await userService.findOrCreateUserByOAuth('google', googleId, email, fullName, avatarUrl);

    if (!user) {
      console.error('Failed to find or create user account during OAuth');
      return res.redirect(`${config.frontendUrl}/login?error=oauth_failed&message=user_processing_error`);
    }

    // Generate JWT tokens
    const accessToken = tokenService.generateAccessToken(user.id, user.email);
    const refreshToken = await tokenService.generateAndStoreRefreshToken(user.id);

    // Redirect to frontend with tokens in query parameters
    const redirectUrl = `${config.frontendUrl}/oauth-callback?access_token=${accessToken}&refresh_token=${refreshToken}`;
    return res.redirect(redirectUrl);

  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    let errorCode = 'internal_server_error';
    if (err.response?.data?.error?.message) {
        // Try to get a more specific error code from Google's response if available
        errorCode = err.response.data.error.message.toLowerCase().replace(/\s+/g, '_');
    } else if (err.message) {
        errorCode = err.message.toLowerCase().replace(/\s+/g, '_');
    }
    // Redirect to a frontend error page or login page with error indicators
    return res.redirect(`${config.frontendUrl}/login?error=oauth_failed&message=${errorCode}`);
  }
};
