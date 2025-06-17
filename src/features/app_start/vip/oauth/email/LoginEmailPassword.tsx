import { Box, Link, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import useLoginEmailPassword from './useLoginEmailPassword';
import Button from '@components/button';
import IconLoading from '@components/icon_loading';
import TextField from '@components/textfield';
import Typography from '@components/typography';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const LoginEmailPassword = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate(); // Initialize useNavigate

  const {
    userEmail,
    setUserEmail,
    password,
    setPassword,
    handleLogin,
    isProcessing,
  } = useLoginEmailPassword();

  return (
    <Stack spacing="16px" sx={{ width: '100%' }}>
      <TextField
        label={t('tr_email')}
        value={userEmail}
        onKeyDown={(e) => (e.key === 'Enter' ? handleLogin() : null)}
        onChange={(e) => setUserEmail(e.target.value)}
        sx={{ width: '100%', color: 'var(--black)' }}
        className="h4"
      />

      <TextField
        label={t('tr_password')}
        type="password"
        value={password}
        onKeyDown={(e) => (e.key === 'Enter' ? handleLogin() : null)}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ width: '100%', color: 'var(--black)' }}
        className="h4"
      />

      <Button
        variant="main"
        disabled={userEmail.length === 0 || password.length === 0 || isProcessing}
        onClick={handleLogin}
        sx={{ padding: '8px 32px', minHeight: '44px' }}
        startIcon={isProcessing ? <IconLoading width={22} height={22} /> : null}
      >
        {t('tr_logIn')}
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: '8px' }}>
        <Link
          href="#"
          underline="hover"
          onClick={(e) => {
            e.preventDefault();
            navigate('/request-password-reset'); // Navigate to request-password-reset route
          }}
        >
          <Typography className="label-small-regular" color="var(--accent-main)">
            {t('tr_forgotPassword')}
          </Typography>
        </Link>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: '16px' }}>
        <Typography className="body-small-regular" color="var(--grey-400)">
          {t('tr_dontHaveAccount')}{' '}
          <Link
            href="#"
            underline="hover"
            onClick={(e) => {
              e.preventDefault();
              navigate('/request-access'); // Navigate to request-access route
            }}
          >
            <Typography className="body-small-semibold" color="var(--accent-main)">
              {t('tr_signUp')}
            </Typography>
          </Link>
        </Typography>
      </Box>
    </Stack>
  );
};

export default LoginEmailPassword;
