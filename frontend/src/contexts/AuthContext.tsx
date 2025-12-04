import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string | null;
  verified: boolean;
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('authTokens');
    if (storedTokens) {
      const parsedTokens = JSON.parse(storedTokens);
      setTokens(parsedTokens);
      fetchCurrentUser(parsedTokens.accessToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch current user info
  const fetchCurrentUser = async (accessToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Clear invalid tokens
      localStorage.removeItem('authTokens');
      setTokens(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (email: string, password: string, name?: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        name,
      });

      const { user: newUser, tokens: newTokens } = response.data;
      
      setUser(newUser);
      setTokens(newTokens);
      localStorage.setItem('authTokens', JSON.stringify(newTokens));
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Registration failed. Please try again.');
    }
  };

  // Login user
  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { user: loggedInUser, tokens: newTokens } = response.data;
      
      setUser(loggedInUser);
      setTokens(newTokens);
      localStorage.setItem('authTokens', JSON.stringify(newTokens));
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Login failed. Please check your credentials.');
    }
  };

  // Logout user
  const logout = async () => {
    try {
      if (tokens?.refreshToken && tokens?.accessToken) {
        await axios.post(
          `${API_URL}/auth/logout`,
          { refreshToken: tokens.refreshToken },
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTokens(null);
      localStorage.removeItem('authTokens');
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      tokens,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user && !!tokens,
      setUser,
      setTokens,
    }),
    [user, tokens, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
