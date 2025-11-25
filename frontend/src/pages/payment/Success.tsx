import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { SuccessCharacter } from '../../components/ui/SuccessCharacter';

const Success = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { refetchUser } = useAuth();

  useEffect(() => {
    if (sessionId) {
      // Optionally verify session with backend
      // For now, just refetch user to update subscription status
      refetchUser();
      
      // Redirect to dashboard after a delay
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [sessionId, navigate, refetchUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-white shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
             <SuccessCharacter />
          </div>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-3xl font-extrabold text-gray-900">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mt-2 text-sm text-gray-600 mb-6">
            Thank you for upgrading to Pro. Your account has been updated.
          </p>
          
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-4">
              Redirecting to dashboard in 5 seconds...
            </p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;