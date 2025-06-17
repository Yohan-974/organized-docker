import { useState } from 'react';
import { useAppTranslation } from '@hooks/index';
import { useNewAuth } from '@hooks/useNewAuth'; // Import the new auth hook
import { IconGoogle } from '@icons/index';
import Button from '@components/button'; // Assuming a generic Button component
import IconLoading from '@components/icon_loading'; // For loading state
// Removed OAuthButtonBase and firebase imports

const OAuthGoogle = () => {
  const { t } = useAppTranslation();
  const { initiateGoogleLogin } = useNewAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    try {
      // initiateGoogleLogin directly causes a redirect.
      // If it were to throw an error before redirecting (e.g., config issue),
      // it would be caught here. However, most errors are handled by Google
      // or during the callback.
      initiateGoogleLogin();
      // setIsProcessing(false) might not be reached if redirect is immediate.
      // If there's a scenario where it doesn't redirect, then it should be reset.
      // For instance, if initiateGoogleLogin had an await and could fail.
      // Given it's a window.location.href, this is more for completeness.
    } catch (error) {
      console.error("Google login initiation failed:", error);
      // Potentially use useFeedback here if initiateGoogleLogin could throw a user-facing error
      // e.g., displayOnboardingFeedback({ title: 'Error', message: 'Could not start Google Sign-In.' });
      setIsProcessing(false);
    }
  };

  return (
    <Button
      variant="secondary" // Example: using a standard button
      onClick={handleGoogleLogin}
      disabled={isProcessing}
      startIcon={isProcessing ? <IconLoading /> : <IconGoogle />}
      sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
    >
      {t('tr_oauthGoogle')}
    </Button>
  );
};

export default OAuthGoogle;
