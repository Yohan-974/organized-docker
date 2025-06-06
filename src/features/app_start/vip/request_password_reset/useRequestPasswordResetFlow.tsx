import { useState } from 'react';
import { useNewAuth } from '@hooks/useNewAuth';
import { useAppTranslation } from '@hooks/index'; // For i18n

const useRequestPasswordResetFlow = () => {
  const { t } = useAppTranslation();
  const { requestPasswordReset, isLoadingAuth } = useNewAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmitRequest = async () => {
    setMessage(null);
    setIsSuccess(false);

    if (!email.trim()) {
      setMessage(t('tr_emailIsRequired')); // Example translation key
      return;
    }
    // Basic email validation (can be more sophisticated)
    if (!/\S+@\S+\.\S+/.test(email)) {
      setMessage(t('tr_invalidEmailFormat')); // Example translation key
      return;
    }

    const result = await requestPasswordReset(email);

    if (result.success) {
      setMessage(t('tr_passwordResetLinkSentMessage')); // Generic success message
      setIsSuccess(true);
      setEmail(''); // Clear email field on success
    } else {
      // Error handling - result.error might contain details
      // For security, usually keep the message generic unless it's a specific non-revealing error
      const errorMsg = (result.error as any)?.response?.data?.message || (result.error as any)?.message;
      // Check for common non-revealing error messages if your backend sends them
      if (errorMsg && typeof errorMsg === 'string' &&
          (errorMsg.toLowerCase().includes('user not found') || errorMsg.toLowerCase().includes('no user with this email'))) {
         setMessage(t('tr_passwordResetLinkSentMessage')); // Still show generic success for user not found
         setIsSuccess(true); // Treat as success from user's perspective to prevent email enumeration
      } else {
        setMessage(errorMsg || t('tr_requestPasswordResetFailed'));
        setIsSuccess(false);
      }
    }
  };

  return {
    email,
    setEmail,
    message,
    setMessage, // Allow clearing message from UI if needed
    isSuccess,
    isLoadingAuth, // Expose loading state from useNewAuth
    handleSubmitRequest,
  };
};

export default useRequestPasswordResetFlow;
