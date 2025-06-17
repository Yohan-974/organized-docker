import { Stack, Alert } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import useRequestPasswordResetFlow from './useRequestPasswordResetFlow';
import Button from '@components/button';
import IconLoading from '@components/icon_loading';
import TextField from '@components/textfield';
import Typography from '@components/typography';
import PageHeader from '@features/app_start/shared/page_header';
import { useNavigate } from 'react-router-dom';
import Link from '@components/link'; // Assuming a custom Link component or use MuiLink

const RequestPasswordResetForm = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  const {
    email,
    setEmail,
    message,
    setMessage, // Added setMessage to allow clearing
    isSuccess,
    isLoadingAuth,
    handleSubmitRequest,
  } = useRequestPasswordResetFlow();

  const handleBackToLogin = () => {
    setMessage(null); // Clear any messages
    navigate('/login');
  };

  return (
    <Stack spacing="16px" sx={{ alignItems: 'center', padding: '24px', width: '100%', maxWidth: '450px' }}>
      <PageHeader
        title={t('tr_forgotYourPassword')}
        description={!isSuccess ? t('tr_requestPasswordResetDescription') : ''} // Hide description on success
        showBackButton={true}
        onBack={handleBackToLogin}
      />

      {message && (
        <Alert severity={isSuccess ? 'success' : 'error'} sx={{ width: '100%', mt: 2 }}>
          {message}
        </Alert>
      )}

      {!isSuccess && ( // Only show form if request hasn't been successfully sent
        <>
          <TextField
            label={t('tr_email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ width: '100%', color: 'var(--black)', mt: 2 }}
            className="h4" // Or appropriate class for styling
            required
            disabled={isLoadingAuth}
          />

          <Button
            variant="main"
            disabled={!email.trim() || isLoadingAuth}
            onClick={handleSubmitRequest}
            sx={{ padding: '8px 32px', minHeight: '44px', width: '100%', mt: 2 }}
            startIcon={isLoadingAuth ? <IconLoading width={22} height={22} /> : null}
          >
            {t('tr_sendResetLink')}
          </Button>
        </>
      )}

      {(isSuccess) && ( // Show "Back to Login" only on success or if form is hidden
         <Button
            variant="secondary" // Or main, depending on desired emphasis
            onClick={handleBackToLogin}
            sx={{ padding: '8px 32px', minHeight: '44px', width: '100%', mt: 2 }}
          >
            {t('tr_backToLogin')}
          </Button>
      )}

      {/* Always show "Back to Login" link if form is also shown (not success state) */}
      {!isSuccess && (
         <Link href="#" onClick={(e) => { e.preventDefault(); handleBackToLogin(); }} sx={{ mt: 2 }}>
            <Typography className="body-small-semibold" color="var(--accent-main)">
            {t('tr_backToLogin')}
            </Typography>
        </Link>
      )}
    </Stack>
  );
};

export default RequestPasswordResetForm;
