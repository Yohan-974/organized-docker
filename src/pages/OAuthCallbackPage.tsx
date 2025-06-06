import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNewAuth } from '@hooks/useNewAuth';
import { Box, CircularProgress, Typography, Link as MuiLink } from '@mui/material';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthLogin, isLoadingAuth, authError, isAuthenticated } = useNewAuth();

  const [processing, setProcessing] = useState(true); // For initial token parsing and async operations
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      setLocalError(null);
      // handleOAuthLogin will set isLoadingAuth to true
      // and then syncUser, which also sets isLoadingAuth.
      handleOAuthLogin(accessToken, refreshToken)
        .catch((err) => {
          // This catch is for errors thrown by handleOAuthLogin itself,
          // authError from useNewAuth will also be set.
          console.error("OAuth handling error:", err);
          // localError will be set by the other useEffect watching authError
        })
        .finally(() => {
            // setProcessing(false) will be handled by isLoadingAuth changes
        });
    } else {
      setLocalError('OAuth callback error: Required tokens are missing in the URL.');
      setProcessing(false);
      // Optionally, redirect after a delay if tokens are missing
      // setTimeout(() => navigate('/login'), 3000);
    }
  }, [searchParams, handleOAuthLogin, navigate]);

  useEffect(() => {
    // This effect runs when authentication state changes after handleOAuthLogin completes
    if (!isLoadingAuth) {
      setProcessing(false); // Stop local processing indicator
      if (isAuthenticated && !authError) {
        navigate('/'); // Navigate to dashboard/home on successful authentication
      } else if (authError) {
        // If useNewAuth sets an error, reflect it locally
        // The error might be an object, so stringify or get message
        const message = (authError as any)?.message || 'Authentication failed after OAuth callback.';
        setLocalError(`Login failed: ${message}`);
      }
      // If !isAuthenticated and no authError, it might mean initial state or a silent failure.
      // If tokens were missing, localError would already be set.
    }
  }, [isLoadingAuth, isAuthenticated, authError, navigate]);

  if (processing || isLoadingAuth) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          p: 2,
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Processing authentication...</Typography>
      </Box>
    );
  }

  if (localError) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          textAlign: 'center',
          p: 2,
        }}
      >
        <Typography variant="h6" color="error">
          Authentication Error
        </Typography>
        <Typography sx={{ mt: 1, mb: 2 }}>{localError}</Typography>
        <MuiLink href="/login" underline="hover">
          Return to Login
        </MuiLink>
      </Box>
    );
  }

  // Fallback case, though ideally one of the above states should always be met.
  // This could be reached if !isLoadingAuth, !isAuthenticated, and no authError, and no localError.
  // This might mean the redirect to '/' hasn't fired yet or some other unexpected state.
  // For robustness, show a generic message or redirect.
   if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          textAlign: 'center',
          p: 2,
        }}
      >
        <Typography sx={{ mt: 1, mb: 2 }}>
            Preparing your dashboard... If you are not redirected, please{' '}
            <MuiLink href="/login" underline="hover">
             try logging in again.
            </MuiLink>
        </Typography>
      </Box>
    );
  }

  return null; // Or a minimal loader if navigation is expected to be very fast
};

export default OAuthCallbackPage;
