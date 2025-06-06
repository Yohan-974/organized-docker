import { handleDeleteDatabase } from '@services/app';
import { useNewAuth } from '@hooks/useNewAuth'; // Import the new auth hook

const useLogoutConfirm = () => {
  const { logout } = useNewAuth(); // Get the logout function from the new auth hook

  const handleLogout = async () => {
    await logout(); // Call the new logout function first
    await handleDeleteDatabase(); // Then proceed with deleting the database if needed
  };

  return { handleLogout };
};

export default useLogoutConfirm;
