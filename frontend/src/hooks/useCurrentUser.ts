import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
}

export const useCurrentUser = (): User | null => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const authTokens = localStorage.getItem('authTokens');
    if (authTokens) {
      try {
        const tokens = JSON.parse(authTokens);
        if (tokens?.accessToken) {
          // Decode JWT to get user info (simplified - in production use a proper JWT library)
          const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
          setUser({
            id: payload.userId || payload.sub || '',
            email: payload.email || '',
            name: payload.name || null,
          });
        }
      } catch (error) {
        console.error('Failed to decode auth token:', error);
      }
    }
  }, []);

  return user;
};
