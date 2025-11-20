import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Check, Loader2, Zap } from 'lucide-react';

const Pricing = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handlePurchase = async (priceId: string) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/pricing');
      return;
    }

    setIsLoading(priceId);
    try {
      const response = await api.post('/payments/create-checkout-session', {
        priceId,
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Pay as you go
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            No subscriptions. Just buy credits when you need them.
          </p>
          <p className="mt-2 text-md text-indigo-600 font-semibold">
            Current Balance: {user?.credits ?? 0} Credits
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
          {/* Starter Pack */}
          <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Starter Pack</h3>
              <p className="mt-4 text-sm text-gray-500">
                Perfect for testing the waters.
              </p>
              <p className="mt-8">
                <span className="text-4xl font-extrabold text-gray-900">$10</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">for 10 credits</p>
              <button
                type="button"
                onClick={() => handlePurchase('price_10_credits')}
                disabled={isLoading !== null}
                className="mt-8 block w-full bg-indigo-50 border border-transparent rounded-md py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                {isLoading === 'price_10_credits' ? (
                  <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                ) : (
                  'Buy Now'
                )}
              </button>
            </div>
            <div className="pt-6 pb-8 px-6">
              <ul className="space-y-4">
                <li className="flex space-x-3">
                  <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-500">$1.00 per post</span>
                </li>
                <li className="flex space-x-3">
                  <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-500">Never expires</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pro Pack */}
          <div className="border border-indigo-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white ring-2 ring-indigo-500 relative">
            <div className="absolute top-0 right-0 -mt-3 -mr-3 px-3 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
              Most Popular
            </div>
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Hustler Pack</h3>
              <p className="mt-4 text-sm text-gray-500">
                Best value for regular sellers.
              </p>
              <p className="mt-8">
                <span className="text-4xl font-extrabold text-gray-900">$20</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">for 25 credits</p>
              <button
                type="button"
                onClick={() => handlePurchase('price_25_credits')}
                disabled={isLoading !== null}
                className="mt-8 block w-full bg-indigo-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {isLoading === 'price_25_credits' ? (
                  <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                ) : (
                  'Buy Now'
                )}
              </button>
            </div>
            <div className="pt-6 pb-8 px-6">
              <ul className="space-y-4">
                <li className="flex space-x-3">
                  <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-500"><b>$0.80</b> per post</span>
                </li>
                <li className="flex space-x-3">
                  <Zap className="flex-shrink-0 h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-gray-500">20% Savings</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Power Seller Pack */}
          <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Power Pack</h3>
              <p className="mt-4 text-sm text-gray-500">
                For high volume flipping.
              </p>
              <p className="mt-8">
                <span className="text-4xl font-extrabold text-gray-900">$40</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">for 60 credits</p>
              <button
                type="button"
                onClick={() => handlePurchase('price_50_credits')}
                disabled={isLoading !== null}
                className="mt-8 block w-full bg-gray-800 border border-transparent rounded-md py-2 text-sm font-semibold text-white hover:bg-gray-900"
              >
                {isLoading === 'price_50_credits' ? (
                  <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                ) : (
                  'Buy Now'
                )}
              </button>
            </div>
            <div className="pt-6 pb-8 px-6">
              <ul className="space-y-4">
                <li className="flex space-x-3">
                  <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-500"><b>$0.67</b> per post</span>
                </li>
                <li className="flex space-x-3">
                  <Zap className="flex-shrink-0 h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-gray-500">33% Savings</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;