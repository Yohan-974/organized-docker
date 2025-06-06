import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthenticatedRequest } from '../authMiddleware'; // Adjust path as necessary

// Mock dependencies
jest.mock('jsonwebtoken');

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    JWT_SECRET: 'test_jwt_secret_for_middleware',
  };
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

// Mock Express Request, Response, and NextFunction
const mockRequest = (headers: any = {}): AuthenticatedRequest => {
  const req = {} as AuthenticatedRequest;
  req.headers = headers;
  return req;
};

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNextFunction = (): NextFunction => jest.fn();

describe('Auth Middleware', () => {
  let req: AuthenticatedRequest;
  let res: Response;
  let next: NextFunction;

  describe('Successful Authentication', () => {
    it('should call next() and populate req.user if token is valid', () => {
      const mockDecodedPayload = { userId: 'user123', email: 'test@example.com' };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedPayload);
      req = mockRequest({ authorization: 'Bearer valid_token_string' });
      res = mockResponse();
      next = mockNextFunction();

      authMiddleware(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid_token_string', process.env.JWT_SECRET);
      expect(req.user).toEqual(mockDecodedPayload);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Failures', () => {
    it('should return 401 if Authorization header is missing', () => {
      req = mockRequest({}); // No authorization header
      res = mockResponse();
      next = mockNextFunction();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authorization header missing or malformed' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header is malformed (not Bearer)', () => {
      req = mockRequest({ authorization: 'NotBearer invalid_token' });
      res = mockResponse();
      next = mockNextFunction();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authorization header missing or malformed' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is not found after Bearer prefix', () => {
      req = mockRequest({ authorization: 'Bearer ' }); // Token missing after "Bearer "
      res = mockResponse();
      next = mockNextFunction();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token not found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is expired', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });
      req = mockRequest({ authorization: 'Bearer expired_token_string' });
      res = mockResponse();
      next = mockNextFunction();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token expired' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is invalid (JsonWebTokenError)', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });
      req = mockRequest({ authorization: 'Bearer invalid_token_string' });
      res = mockResponse();
      next = mockNextFunction();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 if JWT_SECRET is not defined', () => {
      delete process.env.JWT_SECRET; // Simulate missing secret
      req = mockRequest({ authorization: 'Bearer any_token' });
      res = mockResponse();
      next = mockNextFunction();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server configuration error' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 for other token verification errors', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Some other verification error'); // Generic error
      });
      req = mockRequest({ authorization: 'Bearer problematic_token' });
      res = mockResponse();
      next = mockNextFunction();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to authenticate token' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
