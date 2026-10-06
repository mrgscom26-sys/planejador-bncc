'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserResponse, AuthResponse } from '@planejador-bncc/shared-types';
import { apiClient, setAccessToken, getAccessToken } from '../lib/api-client';

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const data = await apiClient<AuthResponse>('/auth/refresh', {
        method: 'POST',
        skipRefresh: true,
      });

      if (data?.accessToken && data?.user) {
        setAccessToken(data.accessToken);
        setUser(data.user);
        return true;
      }
      return false;
    } catch {
      setAccessToken(null);
      setUser(null);
      return false;
    }
  }, []);

  // Tentar restaurar sessão docente na inicialização via cookie HttpOnly
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        await refreshSession();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await apiClient<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });

      setAccessToken(data.accessToken);
      setUser(data.user);
      router.push('/planos');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignora erro no logout para garantir limpeza de estado
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
