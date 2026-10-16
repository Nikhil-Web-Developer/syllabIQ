import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendPositive,
}) => {
  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-md shadow-lg shadow-slate-950/20 hover:border-slate-600/80 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-100 tracking-tight">
            {value}
          </p>
        </div>
        <div className="p-3 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl">
          {icon}
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/40 pt-3">
          <span>{subtitle}</span>
          {trend && (
            <span
              className={`font-semibold ${
                trendPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
