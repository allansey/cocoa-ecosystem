import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from '@/firebase';

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: 'FARMER' | 'BUYER';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  signInToFirebase: (firebaseToken: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (hydrated: boolean) => set({ _hasHydrated: hydrated }),
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => {
        if (auth) signOut(auth).catch(() => {});
        set({ user: null, token: null, isAuthenticated: false });
      },
      signInToFirebase: async (firebaseToken: string) => {
        if (!auth || !firebaseToken) return;
        try {
          await signInWithCustomToken(auth, firebaseToken);
        } catch (e) {
          console.error('Firebase sign-in failed:', e);
        }
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
