import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useNewAuth } from '@hooks/useNewAuth';
import { useAppTranslation } from '@hooks/index';
import { Box, Stack, TextField as MuiTextField, Button as MuiButton, Typography, Alert, Link as MuiLink } from '@mui/material'; // Using Mui components directly
import PageHeader from '@features/app_start/shared/page_header'; // Assuming this path
import IconLoading from '@components/icon_loading'; // Assuming this path

const ResetPasswordPage = () => {
  const { t } = useAppTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword, isLoadingAuth } = useNewAuth();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setMessage(t('tr_resetPasswordTokenMissing')); // Example translation key
      setIsSuccess(false);
    }
  }, [searchParams, t]);

  const handleSubmitPassword = async () => {
    setMessage(null);
    setIsSuccess(false);

    if (!token) {
      setMessage(t('tr_resetPasswordTokenMissingOrInvalid')); // Example translation key
      return;
    }
    if (password.length < 6) {
      setMessage(t('tr_passwordTooShort')); // Example: "Password must be at least 6 characters."
      return;
    }
    if (password !== confirmPassword) {
      setMessage(t('tr_passwordsDoNotMatch')); // Example translation key
      return;
    }

    const result = await resetPassword(token, password);

    if (result.success) {
      setMessage(t('tr_passwordResetSuccessMessage')); // Example: "Password reset successfully. You can now login."
      setIsSuccess(true);
      setPassword('');
      setConfirmPassword('');
      // Optionally redirect to login after a delay
      // setTimeout(() => navigate('/login'), 3000);
    } else {
      const errorMsg = (result.error as any)?.response?.data?.message || (result.error as any)?.message;
      setMessage(errorMsg || t('tr_resetPasswordFailed')); // Example: "Failed to reset password. The token might be invalid or expired."
      setIsSuccess(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 'calc(100vh - 64px)',
        paddingTop: '2rem',
        paddingX: '1rem', // Added horizontal padding
      }}
    >
      <Stack spacing="16px" sx={{ alignItems: 'center', width: '100%', maxWidth: '450px' }}>
        <PageHeader
          title={t('tr_resetYourPassword')}
          showBackButton={false} // Or true with navigate('/login')
        />

        {message && (
          <Alert severity={isSuccess ? 'success' : 'error'} sx={{ width: '100%', mt: 2 }}>
            {message}
          </Alert>
        )}

        {!isSuccess && token && ( // Only show form if token exists and not yet successful
          <>
            <MuiTextField
              label={t('tr_newPassword')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              disabled={isLoadingAuth}
              sx={{ mt: 2 }}
            />
            <MuiTextField
              label={t('tr_confirmNewPassword')}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
              disabled={isLoadingAuth}
              sx={{ mt: 2 }}
            />
            <MuiButton
              variant="contained" // Mui standard variant
              color="primary" // Mui standard color
              disabled={!password || !confirmPassword || isLoadingAuth}
              onClick={handleSubmitPassword}
              fullWidth
              startIcon={isLoadingAuth ? <IconLoading width={22} height={22} /> : null}
              sx={{ padding: '10px 0', minHeight: '44px', mt: 2 }}
            >
              {t('tr_resetPasswordButton')}
            </MuiButton>
          </>
        )}

        {(isSuccess || !token) && ( // Show "Back to Login" if successful or token was missing initially
            <MuiLink component={RouterLink} to="/login" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
                <Typography color="primary">
                    {t('tr_backToLogin')}
                </Typography>
            </MuiLink>
        )}
      </Stack>
    </Box>
  );
};

export default ResetPasswordPage;
