import RequestPasswordResetForm from '@features/app_start/vip/request_password_reset/RequestPasswordResetForm';
import Box from '@mui/material/Box';

const RequestPasswordResetPage = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: 'calc(100vh - 64px)', // Assuming 64px is header height
        paddingTop: '2rem',
        // backgroundColor: 'var(--white)', // Or your app's background
      }}
    >
      <RequestPasswordResetForm />
    </Box>
  );
};

export default RequestPasswordResetPage;
