import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import useRequestAccessForm from './useRequestAccessForm';
import Button from '@components/button';
import IconLoading from '@components/icon_loading';
import TextField from '@components/textfield';
import Typography from '@components/typography';
import PageHeader from '@features/app_start/shared/page_header'; // Assuming PageHeader exists
import { useNavigate } from 'react-router-dom'; // For back button and navigation

const RequestAccessForm = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  const {
    fullName,
    setFullName,
    email,
    setEmail,
    isProcessing,
    handleSubmit,
    submittedData,
    handleClearSubmittedData,
  } = useRequestAccessForm();

  const handleGoBack = () => {
    if (submittedData) {
      handleClearSubmittedData(); // Clear data if going back from confirmation
    }
    navigate(-1); // Go back to the previous page (login/chooser)
  };

  return (
    <Stack spacing="16px" sx={{ alignItems: 'center', padding: '24px' }}>
      <PageHeader
        title={t('tr_requestAccess')}
        description={
          submittedData
            ? t('tr_requestSubmittedNotice')
            : t('tr_requestAccessFormDescription')
        }
        showBackButton={true}
        onBack={handleGoBack}
      />

      {submittedData ? (
        <Stack spacing="16px" sx={{ width: '100%', maxWidth: '400px', mt: '24px', alignItems: 'center' }}>
          <Typography className="h2" color="var(--accent-main)">
            {t('tr_requestSubmittedSuccessfully')}
          </Typography>
          <Box sx={{ p: 2, border: '1px solid var(--grey-200)', borderRadius: '8px', backgroundColor: 'var(--grey-100)', width: '100%'}}>
            <Typography className="body-semibold">
              {t('tr_fullName')}: {submittedData.fullName}
            </Typography>
            <Typography className="body-semibold" sx={{ mt: 1 }}>
              {t('tr_email')}: {submittedData.email}
            </Typography>
          </Box>
          <Typography className="body-regular" sx={{textAlign: 'center', mt: 1}}>
            {t('tr_requestAccessInstructions')}
          </Typography>
          <Button
            variant="main"
            onClick={handleClearSubmittedData}
            sx={{ mt: 2, padding: '8px 32px', minHeight: '44px' }}
          >
            {t('tr_makeAnotherRequest')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/login')} // Or specific login route
            sx={{ mt: 1, padding: '8px 32px', minHeight: '44px' }}
          >
            {t('tr_backToLogin')}
          </Button>
        </Stack>
      ) : (
        <Stack spacing="16px" sx={{ width: '100%', maxWidth: '400px', mt: '24px' }}>
          <TextField
            label={t('tr_fullName')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            sx={{ width: '100%', color: 'var(--black)' }}
            className="h4"
            required
          />

          <TextField
            label={t('tr_email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ width: '100%', color: 'var(--black)' }}
            className="h4"
            required
          />

          <Button
            variant="main"
            disabled={!fullName.trim() || !email.trim() || isProcessing}
            onClick={handleSubmit}
            sx={{ padding: '8px 32px', minHeight: '44px' }}
            startIcon={isProcessing ? <IconLoading width={22} height={22} /> : null}
          >
            {t('tr_submitRequest')}
          </Button>
        </Stack>
      )}
    </Stack>
  );
};

export default RequestAccessForm;
