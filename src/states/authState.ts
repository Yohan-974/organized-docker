import { atom } from 'jotai';

// Define the User type based on what authService.getCurrentUser() and backend returns
// This should align with the User interface in authService.ts or a shared types definition.
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const currentUserAtom = atom<User | null>(null);

export const isAuthenticatedAtom = atom((get) => get(currentUserAtom) !== null);

export const isLoadingAuthAtom = atom<boolean>(true); // Start with true for initial auth check

export const authErrorAtom = atom<any | null>(null); // Can store error object or message string
