'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Profile, OrganizationGroup } from '@/types';

interface AuthContextType {
  profile: Profile | null;
  groupId: string | null;
  group: OrganizationGroup | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  groupId: null,
  group: null,
  isLoading: false,
  signOut: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  initialProfile?: Profile | null;
  initialGroup?: OrganizationGroup | null;
}

export function AuthProvider({ children, initialProfile, initialGroup }: AuthProviderProps) {
  const profile = initialProfile ?? null;
  const group = initialGroup ?? null;

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch (err) {
      console.error('Sign out error:', err);
    }
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ profile, groupId: profile?.group_id ?? null, group, isLoading: false, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
