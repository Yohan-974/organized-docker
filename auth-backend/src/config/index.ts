import dotenv from 'dotenv';

dotenv.config();

const assertEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
};

export default {
  databaseUrl: assertEnvVar('DATABASE_URL'),
  jwtSecret: assertEnvVar('JWT_SECRET'),
  jwtRefreshSecret: assertEnvVar('JWT_REFRESH_SECRET'),
  port: process.env.PORT || '3001',

  googleClientId: assertEnvVar('GOOGLE_CLIENT_ID'),
  googleClientSecret: assertEnvVar('GOOGLE_CLIENT_SECRET'),
  apiBaseUrl: assertEnvVar('API_BASE_URL'),
  frontendUrl: assertEnvVar('FRONTEND_URL'),

  passwordResetTokenSecret: assertEnvVar('PASSWORD_RESET_TOKEN_SECRET'),
  passwordResetTokenExpiresIn: assertEnvVar('PASSWORD_RESET_TOKEN_EXPIRES_IN'),
};
