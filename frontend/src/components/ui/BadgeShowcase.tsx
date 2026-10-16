import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import {
  Sparkles,
  Award,
  CheckCircle2,
  CloudRain,
  Waves,
  Zap,
  Lock,
} from 'lucide-react';
import { BadgeItem } from '../../types';

interface BadgeShowcaseProps {
  userBadges: BadgeItem[];
  allBadges?: BadgeItem[];
  title?: string;
  subtitle?: string;
}

export const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({
  userBadges = [],
  allBadges = [],
  title = 'Capacity Milestones & Badges',
  subtitle = 'Earned credentials and academic distinctions across Ministry training modules.',
}) => {
  const getIcon = (iconName: string, earned: boolean) => {
    const className = `h-6 w-6 ${earned ? 'text-amber-400' : 'text-slate-600'}`;
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Award':
        return <Award className={className} />;
      case 'CheckCircle2':
        return <CheckCircle2 className={className} />;
      case 'CloudRain':
        return <CloudRain className={className} />;
      case 'Waves':
        return <Waves className={className} />;
      case 'Zap':
        return <Zap className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  const earnedCodes = new Set(userBadges.map((b) => b.code));

  // If allBadges provided, show earned + locked; else show earned
  const displayList = allBadges.length > 0 ? allBadges : userBadges;

  return (
    <Card className="space-y-4 border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-slate-900/60 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            {title}
          </h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <Badge variant="purple">{userBadges.length} Badges Earned</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
        {displayList.map((badge) => {
          const isEarned = earnedCodes.has(badge.code) || Boolean(badge.awarded_at);

          return (
            <div
              key={badge.code || badge.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 relative overflow-hidden ${
                isEarned
                  ? 'bg-slate-900/90 border-amber-500/30 hover:border-amber-500/60 shadow-md shadow-amber-500/5'
                  : 'bg-slate-950/40 border-slate-800/80 opacity-60'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${
                  isEarned
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}
              >
                {isEarned ? getIcon(badge.icon, true) : <Lock className="h-5 w-5 text-slate-600" />}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4
                    className={`text-xs font-bold truncate ${
                      isEarned ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {badge.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {badge.description}
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px]">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full ${
                      isEarned
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {badge.criteria}
                  </span>
                  {badge.awarded_at && (
                    <span className="text-slate-500">
                      {new Date(badge.awarded_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
