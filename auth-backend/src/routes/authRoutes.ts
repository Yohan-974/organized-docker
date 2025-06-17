import { Router } from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  refreshToken,
  logout,
  googleOAuthStart,
  googleOAuthCallback,
  requestPasswordReset,
  resetPassword
} from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Standard auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Password Reset routes
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected route - requires authentication
router.get('/me', authMiddleware, getCurrentUser);

// Google OAuth routes
router.get('/google', googleOAuthStart);
router.get('/google/callback', googleOAuthCallback);

export default router;
