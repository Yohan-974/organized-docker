import { useState } from 'react';

export interface SubmittedAccessRequestData {
  fullName: string;
  email: string;
}

const useRequestAccessForm = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // Optional: for future API calls
  const [submittedData, setSubmittedData] = useState<SubmittedAccessRequestData | null>(null);

  const handleSubmit = () => {
    // Basic validation (can be expanded)
    if (!fullName.trim() || !email.trim()) {
      alert('Full Name and Email are required.'); // Simple alert, or use a feedback system
      return;
    }
    // More sophisticated email validation could be added here

    setIsProcessing(true); // If an API call were made
    // Simulate API call delay or processing
    setTimeout(() => {
      setSubmittedData({ fullName, email });
      setIsProcessing(false);
    }, 500); // Mock delay
  };

  const handleClearSubmittedData = () => {
    setSubmittedData(null);
    setFullName(''); // Optionally clear form fields
    setEmail('');
  };

  return {
    fullName,
    setFullName,
    email,
    setEmail,
    isProcessing,
    handleSubmit,
    submittedData,
    handleClearSubmittedData,
  };
};

export default useRequestAccessForm;
