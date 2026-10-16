import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl shadow-slate-950/20 transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-600 hover:shadow-2xl' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
