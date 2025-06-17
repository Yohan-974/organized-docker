import { google } from 'googleapis';
import config from './index';

const oauth2Client = new google.auth.OAuth2(
  config.googleClientId,
  config.googleClientSecret,
  `${config.apiBaseUrl}/api/auth/google/callback` // Redirect URI
);

export default oauth2Client;

export const googleOAuthScopes = [
  'https://www.googleapis.com/auth/userinfo.profile', // See user's basic profile info (name, photo, etc.)
  'https://www.googleapis.com/auth/userinfo.email',   // See user's primary Google account email address
];
