'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface PortalCustomer {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  address: string | null;
  referral_code: string | null;
  group_id: string;
  created_at: string;
}

export interface PortalRewards {
  balance: number;
  lifetime_earned: number;
}

interface PortalContextType {
  customer: PortalCustomer | null;
  rewards: PortalRewards | null;
  memberSince: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const PortalContext = createContext<PortalContextType>({
  customer: null,
  rewards: null,
  memberSince: null,
  isLoading: false,
  signOut: async () => {},
});

interface PortalAuthProviderProps {
  children: ReactNode;
  customer: PortalCustomer | null;
  rewards: PortalRewards | null;
  memberSince: string | null;
}

export function PortalAuthProvider({ children, customer, rewards, memberSince }: PortalAuthProviderProps) {
  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {}
    window.location.href = '/portal/login';
  };

  return (
    <PortalContext.Provider value={{ customer, rewards, memberSince, isLoading: false, signOut }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  return useContext(PortalContext);
}
