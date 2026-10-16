import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-6xl font-black text-brand-500">404</h1>
      <h2 className="mt-4 text-2xl font-bold text-slate-100">Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-400 max-w-md">
        The requested resource or endpoint does not exist or has been moved.
      </p>
      <Link to="/" className="mt-6">
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
};
