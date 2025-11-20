import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Payment Successful!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Thank you for upgrading to Pro. Your account has been updated.
          </p>
          <div className="mt-6">
            <p className="text-sm text-gray-500">
              Redirecting to dashboard in 5 seconds...
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;