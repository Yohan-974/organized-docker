import { useState } from 'react';
import { displayOnboardingFeedback } from '@services/states/app';
import { useAppTranslation } from '@hooks/index';
import { isEmailValid } from '@services/validator/index';
import { getMessageByCode } from '@services/i18n/translation';
import useFeedback from '@features/app_start/shared/hooks/useFeedback';
import { useNewAuth } from '@hooks/useNewAuth'; // Import useNewAuth

const useLoginEmailPassword = () => {
  const { t } = useAppTranslation();
  const { hideMessage, showMessage, isError } = useFeedback(); // Assuming isError is part of useFeedback
  const { login } = useNewAuth(); // Get login function from useNewAuth

  const [isProcessing, setIsProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (isProcessing) return;

    hideMessage();
    setIsProcessing(true);

    if (!isEmailValid(userEmail)) {
      displayOnboardingFeedback({
        title: t('tr_invalidEmail'), // More specific title
        message: t('tr_emailNotValid'), // More specific message
      });
      showMessage();
      setIsProcessing(false);
      return;
    }

    if (password.length === 0) {
      displayOnboardingFeedback({
        title: t('tr_invalidPassword'), // Title for empty password
        message: t('tr_passwordRequired'), // Message for empty password
      });
      showMessage();
      setIsProcessing(false);
      return;
    }

    try {
      await login(userEmail, password);
      // On successful login, useNewAuth's syncUser will handle global state.
      // Navigation or further actions will be handled by a component observing isAuthenticatedAtom or currentUserAtom.
      // No explicit success message here as the UI should react to auth state change.
    } catch (error: any) {
      // useNewAuth's login method throws an error, which can be caught here.
      // The error might already be handled by useNewAuth setting authErrorAtom.
      // This part is for additional specific feedback if needed, or if useNewAuth's error isn't directly displayed.
      let errorMessage = t('tr_loginFailed'); // Generic login failed message
      if (error.response?.data?.message) {
        errorMessage = getMessageByCode(error.response.data.message);
      } else if (error.message) {
        // For network errors or other non-API errors
        errorMessage = error.message;
      }

      displayOnboardingFeedback({
        title: t('tr_loginFailedTitle'),
        message: errorMessage,
      });
      showMessage();
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    userEmail,
    setUserEmail,
    password,
    setPassword,
    handleLogin,
    isError, // Expose isError from useFeedback if it's used to show error state in UI
    hideMessage, // Expose hideMessage to allow UI to clear message
  };
};

export default useLoginEmailPassword;
