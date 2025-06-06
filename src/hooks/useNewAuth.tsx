import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import authService from '../services/authService'; // Assuming authService is in ../services
import {
  currentUserAtom,
  isLoadingAuthAtom,
  authErrorAtom,
  User,
} from '../states/authState';
import { settingsState } from '@states/settings'; // Import settingsState
import {
  dbAppSettingsUpdate,
  dbAppSettingsSaveProfilePic,
  dbAppSettingsGet,
} from '@services/dexie/settings'; // Import Dexie functions
import worker from '@services/worker/backupWorker'; // Import worker
import axios from 'axios'; // Import axios for isAxiosError

export const useNewAuth = () => {
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const [isLoadingAuth, setIsLoadingAuth] = useAtom(isLoadingAuthAtom);
  const [authError, setAuthError] = useAtom(authErrorAtom);
  const setSettingsState = useSetAtom(settingsState);

  const syncUser = async () => {
    setIsLoadingAuth(true);
    try {
      const user: User = await authService.getCurrentUser();
      setCurrentUser(user);
      setAuthError(null);

      const fullName = user.full_name || '';
      const firstSpaceIndex = fullName.indexOf(' ');
      let firstName = fullName;
      let lastName = '';

      if (firstSpaceIndex !== -1) {
        firstName = fullName.substring(0, firstSpaceIndex);
        lastName = fullName.substring(firstSpaceIndex + 1);
      }

      const userSettingsUpdate = {
        'user_settings.user_local_uid': user.id,
        'user_settings.firstname.value': firstName,
        'user_settings.lastname.value': lastName,
        'user_settings.firstname.updatedAt': new Date().toISOString(),
        'user_settings.lastname.updatedAt': new Date().toISOString(),
      };
      await dbAppSettingsUpdate(userSettingsUpdate);

      if (user.avatar_url) {
        await dbAppSettingsSaveProfilePic(user.avatar_url, 'backend');
      }

      const latestSettings = await dbAppSettingsGet();
      setSettingsState(latestSettings);
      worker.postMessage({ field: 'userId', value: user.id });
      // Send idToken to worker
      const accessToken = authService.getAccessToken();
      worker.postMessage({ field: 'idToken', value: accessToken });


    } catch (error) {
      setCurrentUser(null);
      authService.clearTokens();
      if (error instanceof Error && error.message.includes('No refresh token')) {
        setAuthError(null);
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        setAuthError(null);
        console.log("Session expired or user not logged in.");
      } else {
        setAuthError(error);
      }

      const clearUserSettings = {
        'user_settings.user_local_uid': '',
        'user_settings.firstname.value': '',
        'user_settings.lastname.value': '',
      };
      await dbAppSettingsUpdate(clearUserSettings);
      await dbAppSettingsSaveProfilePic(undefined, 'backend');

      const latestSettings = await dbAppSettingsGet();
      setSettingsState(latestSettings);
      worker.postMessage({ field: 'userId', value: undefined });
      worker.postMessage({ field: 'idToken', value: undefined }); // Clear idToken in worker

    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    if (authService.getAccessToken()) {
      syncUser();
    } else {
      setIsLoadingAuth(false);
      setCurrentUser(null);
      worker.postMessage({ field: 'userId', value: undefined });
      worker.postMessage({ field: 'idToken', value: undefined }); // Clear idToken if no access token on mount
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await authService.login(email, password);
      await syncUser();
      return currentUser;
    } catch (error: any) {
      setAuthError(error);
      setIsLoadingAuth(false);
      setCurrentUser(null);
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
        await authService.register(email, password, fullName);
        await syncUser();
    } catch (error: any) {
      setAuthError(error);
      setIsLoadingAuth(false);
      setCurrentUser(null);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout server call failed, proceeding with client-side cleanup:", error);
    } finally {
      setCurrentUser(null);
      authService.clearTokens();

      const clearUserSettings = {
        'user_settings.user_local_uid': '',
        'user_settings.firstname.value': '',
        'user_settings.lastname.value': '',
      };
      await dbAppSettingsUpdate(clearUserSettings);
      await dbAppSettingsSaveProfilePic(undefined, 'backend');

      const latestSettings = await dbAppSettingsGet();
      setSettingsState(latestSettings);
      worker.postMessage({ field: 'userId', value: undefined });
      worker.postMessage({ field: 'idToken', value: undefined }); // Clear idToken in worker on logout
      setIsLoadingAuth(false);
    }
  };

  const initiateGoogleLogin = () => {
    authService.initiateGoogleLogin();
  };

  const handleOAuthLogin = async (accessToken: string, refreshToken: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      authService.storeTokens(accessToken, refreshToken);
      await syncUser();
    } catch (error: any) {
      setAuthError(error);
      setCurrentUser(null);
      authService.clearTokens();
      setIsLoadingAuth(false);
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const response = await authService.requestPasswordReset(email);
      // Backend should always return 200 OK for requestPasswordReset to prevent email enumeration.
      // Success here means the request was processed by the backend.
      // UI should show a generic message like "If your email is registered, you will receive a link."
      // No need to set authError to a success message.
      return { success: true, data: response };
    } catch (error: any) {
      // This error is typically for network issues or if the backend somehow errors out (e.g. 500).
      setAuthError(error);
      return { success: false, error };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const response = await authService.resetPassword(token, newPassword);
      // Password reset was successful.
      // The backend invalidated refresh tokens. User might need to log in again.
      // UI should show a success message and probably redirect to login.
      // No need to set authError to a success message.
      return { success: true, data: response };
    } catch (error: any) {
      setAuthError(error);
      return { success: false, error };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  return {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoadingAuth,
    authError,
    login,
    register,
    logout,
    initiateGoogleLogin,
    handleOAuthLogin,
    syncUser,
    requestPasswordReset, // Added
    resetPassword, // Added
  };
};
