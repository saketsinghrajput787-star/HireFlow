import React from 'react';
import { Outlet } from 'react-router-dom';

export const StudentPortalLayout: React.FC = () => {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Outlet />
    </div>
  );
};
