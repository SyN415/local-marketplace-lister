import React from 'react';
import StatsCards from '../components/dashboard/StatsCards';
import RecentListings from '../components/dashboard/RecentListings';

const Dashboard: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-black mb-8 uppercase tracking-tighter font-display">
        Dashboard
      </h1>
      
      <StatsCards />
      
      <div className="mt-8">
        <RecentListings limit={5} />
      </div>
    </div>
  );
};

export default Dashboard;