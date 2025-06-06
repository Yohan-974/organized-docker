import RequestAccessForm from '@features/app_start/vip/request_access_form/RequestAccessForm';
import Box from '@mui/material/Box';

const RequestAccessFormPage = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start', // Align to top for forms
        minHeight: 'calc(100vh - 64px)', // Adjust based on header/footer height if any
        paddingTop: '2rem', // Some padding from the top
        // backgroundColor: 'var(--white)', // Or your app's background color
      }}
    >
      <RequestAccessForm />
    </Box>
  );
};

export default RequestAccessFormPage;
