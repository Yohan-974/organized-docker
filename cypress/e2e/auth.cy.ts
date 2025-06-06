// Use a test user from Cypress environment variables or define directly
const TEST_USER_EMAIL = Cypress.env('TEST_USER_EMAIL') || 'testuser@example.com';
const TEST_USER_PASSWORD = Cypress.env('TEST_USER_PASSWORD') || 'password123';
const TEST_USER_FULL_NAME = Cypress.env('TEST_USER_FULL_NAME') || 'Test User Cypress';
const NEW_PASSWORD = 'newPassword456';

// Backend API base URL (adjust if your VITE_AUTH_BACKEND_URL is different or not set for Cypress)
// Assuming Cypress baseUrl is set in cypress.config.ts to the frontend URL.
// The '**/api/auth' will match any host.
const API_AUTH_BASE = '**/api/auth';

describe('User Authentication Flows', () => {
  beforeEach(() => {
    // Clear localStorage to ensure a clean state for each test
    cy.clearLocalStorage();
    // Standard intercepts that might be called on page load or after actions
    cy.intercept('GET', `${API_AUTH_BASE}/me`, { statusCode: 401, body: { message: 'Not authenticated' } }).as('getMeUnauthorized');
  });

  context('Request Access Form', () => {
    it('should allow a user to fill and submit the request access form', () => {
      cy.visit('/#/request-access'); // Assuming hash router and the path

      cy.get('input[label="Full Name"]').type(TEST_USER_FULL_NAME);
      cy.get('input[label="Email"]').type(TEST_USER_EMAIL);
      cy.contains('button', 'Submit Request').click();

      // Verify confirmation
      cy.contains('Request Submitted Successfully').should('be.visible');
      cy.contains(`Full Name: ${TEST_USER_FULL_NAME}`).should('be.visible');
      cy.contains(`Email: ${TEST_USER_EMAIL}`).should('be.visible');
      cy.contains('Please send this information manually to your congregation administrator').should('be.visible');
    });
  });

  context('Email/Password Login and Logout', () => {
    it('should log in a user and then log them out', () => {
      // Navigate to login page (assuming root path redirects to login or shows login form)
      cy.visit('/#/'); // Adjust if your login page has a specific path like /login

      // Intercept login and subsequent /me request
      cy.intercept('POST', `${API_AUTH_BASE}/login`, { fixture: 'login-success.json' }).as('loginRequest');
      cy.intercept('GET', `${API_AUTH_BASE}/me`, { fixture: 'me-success.json' }).as('getMeRequest');

      // Enter credentials and login
      cy.get('input[label="Email"]').type(TEST_USER_EMAIL);
      cy.get('input[label="Password"]').type(TEST_USER_PASSWORD);
      cy.contains('button', 'Log In').click();

      cy.wait('@loginRequest');
      cy.wait('@getMeRequest');

      // Verify successful login (e.g., redirected to dashboard, user name visible)
      // This depends on your app's post-login behavior.
      // For example, if it redirects to a dashboard and shows the user's name:
      cy.url().should('include', '/#/', 'should redirect to dashboard after login'); // or specific dashboard path
      cy.contains(TEST_USER_FULL_NAME).should('be.visible'); // Assuming user's full name is displayed

      // Perform logout
      // This depends on how logout is triggered in your app (e.g., a logout button)
      // Intercept logout request
      cy.intercept('POST', `${API_AUTH_BASE}/logout`, { statusCode: 200, body: { message: 'Logged out successfully' } }).as('logoutRequest');

      // Assuming a logout button exists and is identifiable
      cy.contains('button', 'Logout').click(); // Adjust selector as needed

      cy.wait('@logoutRequest');

      // Verify successful logout
      // e.g., redirected to login page, user name no longer visible
      cy.url().should('not.include', '/user-profile'); // Example: should not be on a protected route
      cy.contains(TEST_USER_FULL_NAME).should('not.exist');
      cy.contains('button', 'Log In').should('be.visible'); // Back on login page
    });

    it('should show an error message for invalid login credentials', () => {
      cy.visit('/#/');
      cy.intercept('POST', `${API_AUTH_BASE}/login`, {
        statusCode: 401,
        body: { message: 'Invalid email or password' },
      }).as('invalidLoginRequest');

      cy.get('input[label="Email"]').type(TEST_USER_EMAIL);
      cy.get('input[label="Password"]').type('wrongpassword');
      cy.contains('button', 'Log In').click();

      cy.wait('@invalidLoginRequest');
      // Assuming your app displays the error message from the response
      cy.contains('Invalid email or password').should('be.visible');
    });
  });

  context('Protected Route Access', () => {
    it('should redirect to login when accessing a protected route unauthenticated, then allow access after login', () => {
      // Attempt to visit protected route
      cy.visit('/#/user-profile');
      cy.url().should('not.include', '/user-profile'); // Should be redirected
      cy.url().should('include', '/#/'); // Or your specific login path if different from root

      // Log in
      cy.intercept('POST', `${API_AUTH_BASE}/login`, { fixture: 'login-success.json' }).as('loginRequest');
      cy.intercept('GET', `${API_AUTH_BASE}/me`, { fixture: 'user-profile.json' }).as('getMeProfileRequest'); // Use a specific fixture for /me on profile page

      cy.get('input[label="Email"]').type(TEST_USER_EMAIL);
      cy.get('input[label="Password"]').type(TEST_USER_PASSWORD);
      cy.contains('button', 'Log In').click();

      cy.wait('@loginRequest');
      cy.wait('@getMeProfileRequest');


      // Now navigate to the protected route
      cy.visit('/#/user-profile');
      cy.url().should('include', '/user-profile');
      // Verify content on the protected route
      cy.contains(`Email: ${TEST_USER_EMAIL}`).should('be.visible'); // Example content from user-profile.json
    });
  });

  context('Password Reset Flow', () => {
    it('should allow user to request password reset and simulate password change', () => {
      // 1. Request Password Reset
      cy.visit('/#/request-password-reset');
      cy.intercept('POST', `${API_AUTH_BASE}/request-password-reset`, { fixture: 'request-password-reset-success.json' }).as('requestReset');

      cy.get('input[label="Email"]').type(TEST_USER_EMAIL);
      cy.contains('button', 'Send Reset Link').click();
      cy.wait('@requestReset');
      cy.contains('If your email is registered, you will receive a password reset link.').should('be.visible');

      // 2. Simulate navigating to Reset Password page with a token
      // (E2E cannot get token from email, so we simulate)
      const MOCK_RESET_TOKEN = 'mockResetToken12345';
      cy.visit(`/#/reset-password?token=${MOCK_RESET_TOKEN}`);

      // 3. Enter new password and submit
      cy.intercept('POST', `${API_AUTH_BASE}/reset-password`, { fixture: 'reset-password-success.json' }).as('resetPassword');

      cy.get('input[label="New Password"]').type(NEW_PASSWORD);
      cy.get('input[label="Confirm New Password"]').type(NEW_PASSWORD);
      cy.contains('button', 'Reset Password').click();
      cy.wait('@resetPassword');
      cy.contains('Password reset successfully. You can now login.').should('be.visible');

      // 4. Attempt to log in with the new password
      cy.visit('/#/'); // Go to login
      // Mock login with NEW_PASSWORD
      cy.intercept('POST', `${API_AUTH_BASE}/login`, (req) => {
        if (req.body.email === TEST_USER_EMAIL && req.body.password === NEW_PASSWORD) {
          req.reply({ fixture: 'login-success.json' });
        } else {
          req.reply({ statusCode: 401, body: { message: 'Invalid email or password' } });
        }
      }).as('loginWithNewPassword');
      cy.intercept('GET', `${API_AUTH_BASE}/me`, { fixture: 'me-success.json' }).as('getMeAfterReset');

      cy.get('input[label="Email"]').type(TEST_USER_EMAIL);
      cy.get('input[label="Password"]').type(NEW_PASSWORD);
      cy.contains('button', 'Log In').click();

      cy.wait('@loginWithNewPassword');
      cy.wait('@getMeAfterReset');
      cy.contains(TEST_USER_FULL_NAME).should('be.visible'); // Verify login with new password
    });
  });

  context('Google OAuth Login (Conceptual)', () => {
    it('should attempt to navigate to Google and handle callback', () => {
      cy.visit('/#/');

      // 1. Click Google Login button
      // We can't truly test the redirect to Google and back in Cypress easily.
      // We can stub window.location.href or spy on it if initiateGoogleLogin modifies it directly.
      // For this test, we assume initiateGoogleLogin sets window.location.href.
      // We'll test the part AFTER the conceptual redirect.

      // This part is tricky for full E2E. Usually, you'd click the button
      // and then stub the part where it redirects, or handle the callback directly.
      // cy.contains('button', 'Sign in with Google').click();
      // cy.location('hostname').should('include', 'accounts.google.com'); // This would fail due to cross-origin

      // 2. Simulate callback from Google with mock tokens
      const MOCK_ACCESS_TOKEN = 'mockGoogleAccessToken';
      const MOCK_REFRESH_TOKEN = 'mockGoogleRefreshToken';

      // Intercept the /me call that useNewAuth makes after tokens are stored
      cy.intercept('GET', `${API_AUTH_BASE}/me`, { fixture: 'me-success.json' }).as('getMeAfterGoogle');

      cy.visit(`/#/oauth-callback?access_token=${MOCK_ACCESS_TOKEN}&refresh_token=${MOCK_REFRESH_TOKEN}`);

      // Verify successful login (tokens stored, user fetched)
      cy.wait('@getMeAfterGoogle');
      cy.url().should('include', '/#/', 'should redirect to dashboard after google oauth callback');
      cy.contains(TEST_USER_FULL_NAME).should('be.visible'); // From me-success.json

      // Verify tokens are in localStorage (optional, implementation detail)
      cy.window().its('localStorage.accessToken').should('eq', MOCK_ACCESS_TOKEN);
      cy.window().its('localStorage.refreshToken').should('eq', MOCK_REFRESH_TOKEN);
    });
  });
});
