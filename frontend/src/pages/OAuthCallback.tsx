import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/alerts';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasHandledCallback = useRef(false);
  
  useEffect(() => {
    const handleCallback = async () => {
      // Prevent duplicate execution in StrictMode
      if (hasHandledCallback.current) return;
      hasHandledCallback.current = true;
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const error = searchParams.get('error');
      
      if (error === 'oauth_failed') {
        toast.error('OAuth authentication failed. Please try again.');
        navigate('/login');
        return;
      }
      
      if (error === 'no_email') {
        toast.error('We couldn\'t get your email. Please make sure your email is public.');
        navigate('/login');
        return;
      }
      
      if (!accessToken || !refreshToken) {
        toast.error('Invalid OAuth response.');
        navigate('/login');
        return;
      }
      
      // Save tokens
      const tokens = { accessToken, refreshToken };
      localStorage.setItem('authTokens', JSON.stringify(tokens));
      
      // Fetch user profile
      try {
        const response = await fetch('http://localhost:3000/auth/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          toast.success(`Welcome ${data.user.name || 'back'}! 🎉`);
          navigate('/');
        } else {
          throw new Error('Failed to fetch user profile');
        }
      } catch (err) {
        console.error('Auth error:', err);
        toast.error('Failed to complete sign in.');
        navigate('/login');
      }
    };
    
    handleCallback();
  }, [searchParams, navigate, setUser]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
