import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setToken } = useAuthContext();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam === 'auth_failed' ? 'Authentication failed. Please try again.' : errorParam);
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (token) {
      // Store the token and redirect to dashboard
      setToken(token);
      navigate('/dashboard');
    } else {
      setError('No authentication token received');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [searchParams, navigate, setToken]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8">
          {error ? (
            <div className="text-center">
              <p className="text-destructive mb-2">{error}</p>
              <p className="text-sm text-muted-foreground">Redirecting to login...</p>
            </div>
          ) : (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Completing sign in...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}