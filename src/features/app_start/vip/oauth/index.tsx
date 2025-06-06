import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import Divider from '@components/divider';
import OAuthGoogle from './google';
import OAuthYahoo from './yahoo';
import LoginEmailPassword from './email/LoginEmailPassword'; // Updated import
import Typography from '@components/typography';

const OAuth = () => {
  const { t } = useAppTranslation();

  return (
    <>
      <LoginEmailPassword /> {/* Updated component */}

      <Stack spacing="32px">
        <Box sx={{ width: '100%' }}>
          <Divider color="var(--accent-300)" sx={{ gap: '32px' }}>
            <Typography color="var(--accent-400)">{t('tr_orLabel')}</Typography>
          </Divider>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <OAuthGoogle />
          <OAuthYahoo />
        </Box>
      </Stack>
    </>
  );
};

export default OAuth;
